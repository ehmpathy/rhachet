import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleEphemeralSshKey } from '@src/.test/assets/genSampleEphemeralSshKey';

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { genEphemeralSshAgent } from './genEphemeralSshAgent';
import { isSshAgentAvailable } from './isSshAgentAvailable';

/**
 * .what = prove the ephemeral agent primitive: it spawns, holds a key for
 *         a sign, and on teardown leaves ZERO reuse window
 * .why  = this is the security crux of the unlock design (vision q5) —
 *         the loaded key must not outlive the invocation
 *
 * .note = integration (spawns real agents); self-isolated — own agent,
 *         own socket, own throwaway key; never touches the human's agent
 */
describe('genEphemeralSshAgent', () => {
  // ssh-agent must be present to run these
  if (!isSshAgentAvailable())
    throw new Error(
      'ssh-agent is required for this integration test — install openssh-client',
    );

  given('[case1] a throwaway ssh-agent for an owner', () => {
    const agent = useBeforeAll(async () =>
      genEphemeralSshAgent({ owner: 'probe' }),
    );

    when('[t0] the agent is spawned', () => {
      then('its socket exists on disk', () => {
        expect(existsSync(agent.sock)).toBe(true);
      });

      then('the agent process is alive', () => {
        // process.kill(pid, 0) throws if the process is gone
        expect(() => process.kill(agent.pid, 0)).not.toThrow();
      });

      then('the agent holds no keys initially', () => {
        const out = spawnSync('ssh-add', ['-l'], {
          encoding: 'utf8',
          timeout: 30_000,
          env: { ...process.env, SSH_AUTH_SOCK: agent.sock },
        });
        // ssh-add -l exits 1 with "no identities" when empty
        expect(out.stdout + out.stderr).toMatch(
          /no identities|has no identities/i,
        );
      });
    });

    when('[t1] teardown is called', () => {
      then('the agent process is dead and the socket is gone', async () => {
        agent.teardown();
        expect(existsSync(agent.sock)).toBe(false);

        // the SIGKILL from teardown is delivered async, so the OS may not have
        // reaped the process the instant teardown returns. poll for its death
        // with a bounded deadline so the assertion is deterministic, not a race
        // (a stray EPERM is a real fault, so surface it — never a failhide)
        const deadline = Date.now() + 2000;
        let processDead = false;
        while (Date.now() < deadline) {
          try {
            process.kill(agent.pid, 0); // throws ESRCH once the process is gone
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
              processDead = true;
              break;
            }
            throw error;
          }
          await new Promise((rest) => setTimeout(rest, 20));
        }
        expect(processDead).toBe(true);
      });

      then('teardown is idempotent (a 2nd call is a no-op)', () => {
        expect(() => agent.teardown()).not.toThrow();
      });
    });
  });

  given('[case2] two owners each spawn their own agent', () => {
    const agentA = useBeforeAll(async () =>
      genEphemeralSshAgent({ owner: 'ehmpath' }),
    );
    const agentB = useBeforeAll(async () =>
      genEphemeralSshAgent({ owner: 'foreman' }),
    );

    when('[t0] both are spawned', () => {
      then('they have distinct sockets (per-owner isolation)', () => {
        expect(agentA.sock).not.toEqual(agentB.sock);
      });

      then('cleanup', () => {
        agentA.teardown();
        agentB.teardown();
        expect(existsSync(agentA.sock)).toBe(false);
        expect(existsSync(agentB.sock)).toBe(false);
      });
    });
  });

  given(
    '[case4] ssh-agent is not installed (the binary cannot be found)',
    () => {
      // reproduce a headless/CI/minimal-container box with no openssh-client by
      // handing the spawn an env whose PATH is a bogus dir, so the `ssh-agent`
      // binary lookup hits ENOENT — the exact first-contact failure a user without
      // ssh-agent installed would hit. the injected env keeps this hermetic (no
      // global process.env mutation) and deterministic across platforms
      const scene = useBeforeAll(async () => {
        const error = getError(() =>
          genEphemeralSshAgent({
            owner: 'absent',
            env: { PATH: '/nonexistent/kr-test-no-ssh-agent' },
          }),
        );
        return { error };
      });

      when('[t0] the agent spawn cannot find the ssh-agent binary', () => {
        then(
          'it fails fast with a ConstraintError (caller-fixable), not a hang',
          () => {
            // ENOENT is a caller-fixable condition (install openssh-client), so it is
            // a ConstraintError (exit 2), NOT a MalfunctionError — see the code note
            expect(scene.error).toBeInstanceOf(ConstraintError);
          },
        );

        then('the error names the openssh-client install fix', () => {
          // pin the exact caller-fixable text a headless user sees — the stable
          // human-visible lines of the treestruct (the serialized metadata carries a
          // random sock path, so we assert the stable lines here + snapshot below)
          expect(scene.error.message).toContain(
            'keyrack needs ssh-agent to hold your key for the unlock, and it is not installed',
          );
          expect(scene.error.message).toContain(
            'install openssh-client (it provides ssh-agent), then retry',
          );
        });

        then('the full user-visible message shape is stable (snapshot)', () => {
          // snapshot the whole treestruct so its text + shape cannot silently
          // drift (rule.forbid.friction-hazards). the serialized metadata holds a
          // random temp sock path, so strip it to a placeholder for determinism
          const sanitized = scene.error.message.replace(
            /\/\S*kr-agent-absent-\S*?\/agent\.sock/g,
            '<sock>',
          );
          expect(sanitized).toMatchSnapshot();
        });
      });
    },
  );

  given('[case3] a key loaded into an ephemeral agent, then torn down', () => {
    // stand up a throwaway passphrase-less key so we can add + sign
    const scene = useBeforeAll(async () => {
      const { keyPath, dir } = genSampleEphemeralSshKey();
      const agent = genEphemeralSshAgent({ owner: 'signer' });
      execFileSync('ssh-add', [keyPath], {
        stdio: 'pipe',
        timeout: 30_000,
        env: { ...process.env, SSH_AUTH_SOCK: agent.sock },
      });
      return { agent, keyPath, dir };
    });

    when('[t0] the agent holds the key', () => {
      then('ssh-add -l lists one identity', () => {
        const out = execFileSync('ssh-add', ['-l'], {
          encoding: 'utf8',
          timeout: 30_000,
          env: { ...process.env, SSH_AUTH_SOCK: scene.agent.sock },
        });
        expect(out).toMatch(/ED25519/i);
      });
    });

    when('[t1] the agent is torn down', () => {
      then('a later ssh-add -l can NOT reach the agent (zero reuse)', () => {
        scene.agent.teardown();
        const out = spawnSync('ssh-add', ['-l'], {
          encoding: 'utf8',
          timeout: 30_000,
          env: { ...process.env, SSH_AUTH_SOCK: scene.agent.sock },
        });
        // socket is gone → agent unreachable → non-zero exit, no identity
        expect(out.status).not.toEqual(0);
        expect(out.stdout).not.toMatch(/ED25519/i);
      });
    });
  });

  given(
    '[case5] a live child process holds an ephemeral agent, then SIGTERM',
    () => {
      // the signal-teardown path can NOT be exercised in-process: the handler
      // re-raises the signal, which would kill the jest runner. so spawn a real
      // child that holds an agent, deliver a REAL SIGTERM, and prove the agent is
      // reaped before the child exits — the Ctrl+C-mid-dialog case (vision q5)
      const scene = useBeforeAll(async () => {
        const childPath = join(
          __dirname,
          '.test',
          'genEphemeralSshAgentChild.ts',
        );
        const tsxBin = join(process.cwd(), 'node_modules', '.bin', 'tsx');
        const child = spawn(tsxBin, [childPath], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        // read the single `PID\tSOCK` line the child prints once its agent is up.
        // a bounded deadline surfaces a wedged child loud, never a silent hang
        const line = await new Promise<string>((accept, reject) => {
          const deadline = setTimeout(
            () =>
              reject(new Error('child did not report its agent within 15s')),
            15_000,
          );
          let buffer = '';
          child.stdout.on('data', (chunk) => {
            buffer += String(chunk);
            const newlineAt = buffer.indexOf('\n');
            if (newlineAt === -1) return;
            clearTimeout(deadline);
            accept(buffer.slice(0, newlineAt));
          });
          child.on('error', reject);
        });
        const [pidRaw, sock] = line.split('\t');
        // fail loud on a malformed report line — never poke ahead with undefined
        if (!pidRaw || !sock)
          throw new Error(
            `child reported a malformed agent line: ${JSON.stringify(line)}`,
          );
        const agentPid = Number(pidRaw);

        // deliver the real signal, then await the child's clean exit — by then the
        // child's signal handler has run teardown (kill agent + remove socket)
        child.kill('SIGTERM');
        await new Promise<void>((accept) => child.once('exit', () => accept()));

        return { agentPid, sock };
      });

      when('[t0] the child has exited after the signal', () => {
        then(
          'the spawned agent socket is gone (signal-teardown reaped it)',
          () => {
            expect(existsSync(scene.sock)).toBe(false);
          },
        );

        then(
          'the spawned agent process is dead (zero reuse survives a Ctrl+C)',
          async () => {
            // the child SIGTERM'd the agent, whose OS reap is async — poll for its
            // death with a bounded deadline so the assertion is deterministic, not a
            // race (a stray EPERM is a real fault, so surface it — never a failhide)
            const deadline = Date.now() + 2000;
            let processDead = false;
            while (Date.now() < deadline) {
              try {
                process.kill(scene.agentPid, 0); // throws ESRCH once the process is gone
              } catch (error) {
                if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
                  processDead = true;
                  break;
                }
                throw error;
              }
              await new Promise((rest) => setTimeout(rest, 20));
            }
            expect(processDead).toBe(true);
          },
        );
      });
    },
  );
});
