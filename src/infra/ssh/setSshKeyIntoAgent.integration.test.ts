import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleEphemeralSshKey } from '@src/.test/assets/genSampleEphemeralSshKey';

import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { genEphemeralSshAgent } from './genEphemeralSshAgent';
import { isSshAgentAvailable } from './isSshAgentAvailable';
import { setSshKeyIntoAgent } from './setSshKeyIntoAgent';

/**
 * .what = prove setSshKeyIntoAgent loads a key into the caller's agent via the
 *         askpass env, and loads ONLY into that agent (not the human's)
 * .why  = this is the native-prompt wire path (vision q2); the passphrase-less
 *         key proves the load path + env without a real GUI (the dialog itself
 *         was proven manually on the wisher's box per the vision)
 *
 * .note = integration (spawns a real ephemeral agent, loads a real throwaway
 *         key); self-isolated — own agent, own socket, own key, torn down after
 * .note = a passphrase-less key needs no prompt, so SSH_ASKPASS is moot here;
 *         the test proves the loader honors the injected env + socket
 * .note = the negative case scripts a real executable askpass that declines to
 *         yield a passphrase — it exits non-zero, the way a cancelled dialog or a
 *         no-valid-passphrase prompt does (SSH_ASKPASS_REQUIRE=force invokes it
 *         with no tty). so the negative path is proven end-to-end: ssh-add exits
 *         non-zero, the loader fails loud with a ConstraintError (a caller-fixable
 *         condition per rule.require.exit-code-semantics — the human retypes /
 *         moves to a desktop), and the agent holds no identity (vision edgecase:
 *         a bad/absent passphrase must fail loud, not silently)
 */
describe('setSshKeyIntoAgent', () => {
  if (!isSshAgentAvailable())
    throw new Error(
      'ssh-agent is required for this integration test — install openssh-client',
    );

  const scene = useBeforeAll(async () => {
    const { keyPath, dialog } = genSampleEphemeralSshKey();
    const agent = genEphemeralSshAgent({ owner: 'loader' });
    return { agent, keyPath, dialog };
  });

  given('[case1] a passphrase-less key and an ephemeral agent', () => {
    when('[t0] the key is loaded into the agent', () => {
      then('the agent then holds exactly that one identity', async () => {
        await setSshKeyIntoAgent({
          sock: scene.agent.sock,
          keyPath: scene.keyPath,
          dialog: scene.dialog,
        });

        const listed = spawnSync('ssh-add', ['-l'], {
          encoding: 'utf8',
          timeout: 30_000,
          env: { ...process.env, SSH_AUTH_SOCK: scene.agent.sock },
        });
        expect(listed.status).toEqual(0);
        expect(listed.stdout).toMatch(/ED25519/i);
      });
    });

    when('[t1] the agent is torn down', () => {
      then('cleanup leaves no reachable agent', () => {
        scene.agent.teardown();
        const listed = spawnSync('ssh-add', ['-l'], {
          encoding: 'utf8',
          timeout: 30_000,
          env: { ...process.env, SSH_AUTH_SOCK: scene.agent.sock },
        });
        expect(listed.status).not.toEqual(0);
      });
    });
  });

  given(
    '[case2] a passphrased key and an askpass that yields no passphrase',
    () => {
      const declineScene = useBeforeAll(async () => {
        const { keyPath, dir } = genSampleEphemeralSshKey({
          passphrase: 'the-correct-passphrase',
        });

        // a REAL executable askpass that exits non-zero, the way a cancelled dialog
        // or a no-valid-passphrase prompt does; SSH_ASKPASS_REQUIRE=force (from
        // asAskpassEnv) invokes it with no tty, so ssh-add fails fast — never a
        // blind wait for a passphrase that will never come
        const askpass = join(dir, 'askpass-decline');
        writeFileSync(askpass, '#!/usr/bin/env bash\nexit 1\n', {
          mode: 0o755,
        });

        const agent = genEphemeralSshAgent({ owner: 'declinepass' });
        return { agent, keyPath, askpass };
      });

      when(
        '[t0] the load is attempted and the dialog yields no passphrase',
        () => {
          then(
            'it fails loud with a ConstraintError and loads no identity',
            async () => {
              const error = await getError(
                setSshKeyIntoAgent({
                  sock: declineScene.agent.sock,
                  keyPath: declineScene.keyPath,
                  dialog: declineScene.askpass,
                }),
              );
              // caller-fixable (retype / desktop), NOT a tool malfunction — so a
              // wrapper gets exit 2, not exit 1 (rule.require.exit-code-semantics)
              expect(error).toBeInstanceOf(ConstraintError);
              expect(error.message).toContain('ssh-add could not load the key');
              // snap only the stable first sentence — the metadata carries the
              // random socket + key paths, so the full message is not deterministic
              expect(error.message.split('\n\n')[0]).toMatchSnapshot();

              // the agent holds NO identity — a failed prompt must never load the key
              const listed = spawnSync('ssh-add', ['-l'], {
                encoding: 'utf8',
                timeout: 30_000,
                env: { ...process.env, SSH_AUTH_SOCK: declineScene.agent.sock },
              });
              expect(listed.status).not.toEqual(0);

              declineScene.agent.teardown();
            },
          );
        },
      );
    },
  );

  given(
    '[case3] a passphrased key on a headless box (no DISPLAY / WAYLAND_DISPLAY)',
    () => {
      const headlessScene = useBeforeAll(async () => {
        const { keyPath, dir } = genSampleEphemeralSshKey({
          passphrase: 'the-correct-passphrase',
        });
        // a real askpass that declines — stands in for "no dialog could render"
        const askpass = join(dir, 'askpass-headless');
        writeFileSync(askpass, '#!/usr/bin/env bash\nexit 1\n', {
          mode: 0o755,
        });
        const agent = genEphemeralSshAgent({ owner: 'headless' });
        return { agent, keyPath, askpass };
      });

      when('[t0] the load is attempted with no graphical session', () => {
        then(
          'it fails loud with a ConstraintError (never a tty prompt, never a hang)',
          async () => {
            // strip the display vars for the duration so ssh-add's env (built
            // from process.env via asAskpassEnv) is truly headless. this proves
            // the vision edgecase: headless degrades to a caller-fix error, the
            // same shape as a cancelled dialog — SSH_ASKPASS_REQUIRE=force runs
            // the askpass even with no display, so the two cannot (and need not)
            // be told apart
            const priorDisplay = process.env.DISPLAY;
            const priorWayland = process.env.WAYLAND_DISPLAY;
            delete process.env.DISPLAY;
            delete process.env.WAYLAND_DISPLAY;
            try {
              const error = await getError(
                setSshKeyIntoAgent({
                  sock: headlessScene.agent.sock,
                  keyPath: headlessScene.keyPath,
                  dialog: headlessScene.askpass,
                }),
              );
              expect(error).toBeInstanceOf(ConstraintError);
              expect(error.message).toContain('ssh-add could not load the key');
              // the message names the headless cause among the caller-fixable set
              expect(error.message).toContain('no graphical session');
              // snapshot the whole treestruct so its text + shape cannot silently
              // drift (rule.forbid.friction-hazards). the serialized metadata holds
              // a random temp sock path + key path, so strip them for determinism
              const sanitized = error.message
                .replace(/\/\S*kr-agent-\S*?\/agent\.sock/g, '<sock>')
                .replace(/"keyPath":\s*"[^"]*"/g, '"keyPath": "<keyPath>"')
                .replace(/"dialog":\s*"[^"]*"/g, '"dialog": "<dialog>"');
              expect(sanitized).toMatchSnapshot();

              // the agent holds NO identity — headless must never load the key
              const listed = spawnSync('ssh-add', ['-l'], {
                encoding: 'utf8',
                timeout: 30_000,
                env: {
                  ...process.env,
                  SSH_AUTH_SOCK: headlessScene.agent.sock,
                },
              });
              expect(listed.status).not.toEqual(0);
            } finally {
              if (priorDisplay === undefined) delete process.env.DISPLAY;
              else process.env.DISPLAY = priorDisplay;
              if (priorWayland === undefined)
                delete process.env.WAYLAND_DISPLAY;
              else process.env.WAYLAND_DISPLAY = priorWayland;
              headlessScene.agent.teardown();
            }
          },
        );
      });
    },
  );
});
