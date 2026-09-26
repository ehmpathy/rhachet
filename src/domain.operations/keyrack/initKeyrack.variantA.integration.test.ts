import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleAskpassDialog } from '@src/.test/assets/genSampleAskpassDialog';
import { genSampleEphemeralSshKey } from '@src/.test/assets/genSampleEphemeralSshKey';
import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import { isSshAgentAvailable } from '@src/infra/ssh/isSshAgentAvailable';

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { genContextKeyrack } from './genContextKeyrack';
import { initKeyrack } from './initKeyrack';

/**
 * .what = prove the LIVE derive-not-store wire-up end-to-end: `initKeyrack` with a
 *         real passphrased ed25519 key derives K from the ssh signature and encrypts
 *         the manifest to K (NO stored secret); then `genContextKeyrack` +
 *         `daoKeyrackHostManifest.get` re-derive the same K via the ephemeral agent
 *         and decrypt — the whole wish, through real code
 * .why  = this is the acceptance of d6: init + unlock now speak sign-as-KDF, and
 *         the passphrase prompt is served by an askpass (a scripted stand-in here)
 *
 * .note = integration (real key, real agent, real age, real fs); self-isolated
 *         via a temp HOME. the scripted askpass echoes the passphrase, so
 *         `SSH_ASKPASS_REQUIRE=force` drives the load headlessly — the exact path
 *         the gnome dialog takes, minus the human keystroke
 */
describe('initKeyrack (Variant A, passphrased ed25519)', () => {
  if (!isSshAgentAvailable())
    throw new Error(
      'ssh-agent is required for this integration test — install openssh-client',
    );

  const scene = useBeforeAll(async () => {
    const home = mkdtempSync(join(tmpdir(), 'kr-initva-'));
    const originalHome = process.env.HOME;
    process.env.HOME = home;

    // a real PASSPHRASED ed25519 key (co-located in the temp HOME)
    const passphrase = 'test-passphrase-123';
    const { keyPath } = genSampleEphemeralSshKey({
      dir: home,
      keyName: 'id_probe',
      passphrase,
      comment: 'probe',
    });

    // a real PASSPHRASE-LESS ed25519 key (the additive-boundary control)
    const { keyPath: keyPathNoPass } = genSampleEphemeralSshKey({
      dir: home,
      keyName: 'id_nopass',
      comment: 'nopass',
    });

    // a scripted askpass that echoes the passphrase (stands in for the dialog)
    const { path: askpass } = genSampleAskpassDialog({
      path: join(home, 'gnome-ssh-askpass'),
      passphrase,
    });

    return {
      home,
      originalHome,
      keyPath,
      keyPathNoPass,
      askpass,
      owner: 'ehmpath',
    };
  });

  afterAll(() => {
    process.env.HOME = scene.originalHome;
  });

  given('[case1] init with a passphrased ed25519 key', () => {
    const initResult = useBeforeAll(async () =>
      initKeyrack({
        owner: scene.owner,
        pubkey: scene.keyPath,
        askpassCandidates: [scene.askpass],
      }),
    );

    when('[t0] init completes', () => {
      then('the manifest recipient is a native age (X25519) recipient', () => {
        expect(initResult.host.effect).toEqual('created');
        expect(initResult.host.recipient.mech).toEqual('age');
        expect(initResult.host.recipient.pubkey.startsWith('age1')).toBe(true);
      });
    });

    when('[t1] unlock recovers K via the ephemeral agent', () => {
      then(
        'the host manifest decrypts (full Variant A roundtrip)',
        async () => {
          const context = genContextKeyrack({
            owner: scene.owner,
            prikeys: [scene.keyPath],
            askpassCandidates: [scene.askpass],
          });
          const result = await daoKeyrackHostManifest.get(
            { owner: scene.owner },
            context,
          );
          expect(result).not.toEqual(null);
          expect(result?.manifest.owner).toEqual(scene.owner);
          expect(result?.manifest.recipients.length).toEqual(1);
        },
      );
    });
  });

  given(
    '[case2] init with a passphrased ed25519 key but no askpass dialog',
    () => {
      when('[t0] no gnome askpass candidate exists (q2 fail-fast)', () => {
        then(
          'init fails fast with a ConstraintError that names the apt fix',
          async () => {
            const error = await getError(
              initKeyrack({
                owner: 'ehmpath-noaskpass', // distinct owner → own manifest, no collision
                pubkey: scene.keyPath,
                askpassCandidates: ['/nonexistent/gnome-ssh-askpass'],
              }),
            );
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain(
              'sudo apt install ssh-askpass-gnome',
            );
            // snap the full user-faced message so its exact text cannot drift
            expect(error.message).toMatchSnapshot();
          },
        );
      });
    },
  );

  given(
    '[case3] init with a passphrase-LESS ed25519 key (additive boundary)',
    () => {
      const initResult = useBeforeAll(async () =>
        // no askpassCandidates: a passphrase-less key must NEVER prompt
        initKeyrack({
          owner: 'ehmpath-nopass', // distinct owner → own manifest
          pubkey: scene.keyPathNoPass,
        }),
      );

      when('[t0] init completes without any prompt', () => {
        then('the manifest recipient is a native age recipient', () => {
          expect(initResult.host.effect).toEqual('created');
          expect(initResult.host.recipient.mech).toEqual('age');
        });
      });
    },
  );
});
