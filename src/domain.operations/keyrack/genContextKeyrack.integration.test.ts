import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleAskpassDialog } from '@src/.test/assets/genSampleAskpassDialog';
import { genSampleEphemeralSshKey } from '@src/.test/assets/genSampleEphemeralSshKey';
import { getKeyrackHostManifestPath } from '@src/infra/getKeyrackHostManifestPath';
import {
  decryptWithIdentity,
  encryptToRecipients,
} from '@src/infra/ssh/ageRecipientCrypto';
import { asAgeRecipientFromSshPubkey } from '@src/infra/ssh/asAgeRecipientFromSshPubkey';
import { SSH_KEY_PATH_MARKER } from '@src/infra/ssh/asSshKeyPathMarker';
import { getOneSshPubkey } from '@src/infra/ssh/getOneSshPubkey';

import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { genContextKeyrack } from './genContextKeyrack';

/**
 * .what = prove derive-not-store identity discovery: a manifest with no usable
 *         ed25519 key falls through to a clean null (never a stored-sidecar-gated
 *         throw), a prompt-free pool recipient decrypts WITHOUT the native prompt,
 *         and a prescribed passphrased NON-ed25519 key surfaces its install-age fix
 * .why  = derive-not-store deleted the wrapped-K sidecar, so the old "sealed K signal"
 *         friction throws are gone: no ed25519 key → null (the caller surfaces its own
 *         no-identity error), a wrong ed25519 key → a different K the trial-decrypt
 *         rejects as a normal miss. the fail-loud guarantee lives on for the ONE case
 *         that still needs the `age` cli — a prescribed passphrased rsa/ecdsa key
 *
 * .note = integration (HOME-isolated temp dir; real ssh keys, real age library);
 *         never touches the human's ~/.rhachet or ~/.ssh. no case here reaches the
 *         ephemeral-agent prompt: case1 has no ed25519 key, case3's key is rsa
 *         (wrong-type → null before any prompt), so all run headlessly
 */
describe('genContextKeyrack', () => {
  given(
    '[case1] a manifest on disk, but no ssh key available to derive/decrypt',
    () => {
      const scene = useBeforeAll(async () => {
        // an isolated HOME with NO ~/.ssh, so no default ed25519 key is found and no
        // derive-not-store path fits — the fall-through-to-null case
        const home = mkdtempSync(join(tmpdir(), 'keyrack-nokey-'));
        const homeBefore = process.env.HOME;
        process.env.HOME = home;

        // a host manifest file must exist, else getOne short-circuits to null anyway
        const manifestPath = getKeyrackHostManifestPath({ owner: 'ehmpath' });
        mkdirSync(dirname(manifestPath), { recursive: true });
        writeFileSync(manifestPath, 'placeholder-manifest-ciphertext', 'utf8');

        return { home, homeBefore };
      });

      afterAll(() => {
        process.env.HOME = scene.homeBefore;
        rmSync(scene.home, { recursive: true, force: true });
      });

      when(
        '[t0] getOne({ for: manifest }) is called with no prescribed key',
        () => {
          then(
            'it returns null — no derive-not-store path fits, no prompt, no throw',
            async () => {
              const context = genContextKeyrack({ owner: 'ehmpath' });

              // derive-not-store has no stored sidecar to gate on: a manifest with no
              // usable ed25519 key yields null, and the caller (the DAO) surfaces its
              // own "no identity could decrypt ... use --prikey" error. never a prompt
              const identity = await context.identity.getOne({
                for: 'manifest',
              });
              expect(identity).toBeNull();
            },
          );
        },
      );
    },
  );

  given(
    '[case2] a manifest sealed to a prompt-free passwordless ed25519 recipient',
    () => {
      // the recompose that keeps a passwordless key a prompt-free candidate: a manifest
      // whose recipient is a passwordless key's age recipient decrypts via the pool with
      // NO native prompt — derive-not-store never fires when a pool identity suffices
      const scene = useBeforeAll(async () => {
        const home = mkdtempSync(join(tmpdir(), 'keyrack-promptfree-'));
        const homeBefore = process.env.HOME;
        process.env.HOME = home;

        // a passwordless ed25519 key in ~/.ssh — discoverIdentities finds it and
        // converts it in-process to an age identity (no prompt). the shared ed25519
        // fixture, written at the canonical discovery path (rule.require.shared-test-fixtures)
        const sshDir = join(home, '.ssh');
        mkdirSync(sshDir, { recursive: true, mode: 0o700 });
        const { keyPath } = genSampleEphemeralSshKey({
          dir: sshDir,
          keyName: 'id_ed25519',
          passphrase: '',
        });

        // encrypt a REAL manifest to that key's age recipient, so a pool trial with
        // the discovered identity genuinely decrypts it
        const recipient = asAgeRecipientFromSshPubkey({
          pubkey: readFileSync(`${keyPath}.pub`, 'utf8'),
        });
        const ciphertext = await encryptToRecipients({
          plaintext: 'a-real-manifest-plaintext',
          recipients: [
            {
              mech: 'age',
              pubkey: recipient,
              label: 'default',
              addedAt: '2026-07-24T00:00:00Z',
            },
          ],
        });
        const manifestPath = getKeyrackHostManifestPath({ owner: 'ehmpath' });
        mkdirSync(dirname(manifestPath), { recursive: true });
        writeFileSync(manifestPath, ciphertext, 'utf8');

        return { home, homeBefore };
      });

      afterAll(() => {
        process.env.HOME = scene.homeBefore;
        rmSync(scene.home, { recursive: true, force: true });
      });

      when('[t0] getOne({ for: manifest }) is called', () => {
        then(
          'the prompt-free pool decrypts it — a non-null identity, no native prompt',
          async () => {
            const context = genContextKeyrack({ owner: 'ehmpath' });

            const identity = await context.identity.getOne({ for: 'manifest' });
            expect(identity).not.toBeNull();
          },
        );
      });
    },
  );

  given('[case3] a prescribed passphrased rsa --prikey, age absent', () => {
    const scene = useBeforeAll(async () => {
      // an isolated HOME with NO ~/.ssh default key + NO ed25519 key, so the
      // prescribed key is the only one — a passphrased RSA key (NOT ed25519), so it
      // is NOT a derive-not-store candidate (wrong type → null, no prompt). it needs
      // the `age` cli to convert; with age absent, its conversion carries the hint
      const home = mkdtempSync(join(tmpdir(), 'keyrack-rsahint-'));
      const homeBefore = process.env.HOME;
      process.env.HOME = home;

      const keyPath = join(home, 'my-locked-rsa-key');
      execFileSync(
        'ssh-keygen',
        [
          '-t',
          'rsa',
          '-b',
          '2048',
          '-f',
          keyPath,
          '-N',
          'test-passphrase',
          '-q',
        ],
        { stdio: 'pipe', timeout: 30_000 },
      );

      // a garbage manifest file: it exists (so getOne does not short-circuit to
      // null), but no identity can decrypt it — so the pool yields no identity
      const manifestPath = getKeyrackHostManifestPath({ owner: 'ehmpath' });
      mkdirSync(dirname(manifestPath), { recursive: true });
      writeFileSync(manifestPath, 'placeholder-manifest-ciphertext', 'utf8');

      // a stub `which` that reports age as absent, so isAgeCliAvailable is false
      // deterministically — the passphrased rsa key then throws the install-age hint
      const stubBin = join(home, 'stubbin');
      mkdirSync(stubBin, { recursive: true });
      writeFileSync(join(stubBin, 'which'), '#!/bin/sh\nexit 1\n', {
        mode: 0o755,
      });

      return { home, homeBefore, keyPath, stubBin };
    });

    afterAll(() => {
      process.env.HOME = scene.homeBefore;
      rmSync(scene.home, { recursive: true, force: true });
    });

    when(
      '[t0] getOne is called with the passphrased rsa key as an explicit --prikey',
      () => {
        then(
          'it surfaces the install-age hint, never a swallowed generic null',
          async () => {
            const context = genContextKeyrack({
              owner: 'ehmpath',
              prikeys: [scene.keyPath],
            });

            const pathBefore = process.env.PATH;
            process.env.PATH = scene.stubBin;
            try {
              const error = await getError(
                context.identity.getOne({ for: 'manifest' }),
              );

              // the explicit --prikey named an actionable fix — it must surface,
              // not degrade to a generic "no identity" (errors-name-the-fix)
              expect(error).toBeInstanceOf(ConstraintError);
              expect(error.message).toContain('install age');
              expect(error.message).toContain('passphrase-protected');

              // pin the EXACT user-visible text so a phrase regression cannot drift
              // silently (rule.require.snapshots + friction-hazards); the per-run
              // temp key path is sanitized so the snapshot stays host-stable
              const sanitized = (error as Error).message
                .split(scene.keyPath)
                .join('<keyPath>');
              expect(sanitized).toMatchSnapshot();
            } finally {
              process.env.PATH = pathBefore;
            }
          },
        );
      },
    );
  });

  given(
    '[case4] a v0 manifest sealed to a RAW ssh-ed25519 recipient (seamless backcompat)',
    () => {
      // THE seamless-backcompat decrypt tier: a pre-feature manifest sealed to a raw
      // `ssh-ed25519` recipient cannot be opened by the prompt-free pool (needs the
      // passphrase) NOR by Variant A's K (a DIFFERENT recipient). getOne's legacy tier
      // must return the age-cli MARKER for the ed25519 key, and that marker must decrypt
      // the raw-ssh seal via `age -d -i` after a gnome-dialog strip. a passphrased key +
      // scripted KEYRACK_ASKPASS drives the strip headlessly (ssh-keygen -p honors
      // SSH_ASKPASS, unlike age's tty read). RED before the legacy tier existed (getOne
      // returned null → the DAO's re-init error), GREEN after
      const scene = useBeforeAll(async () => {
        const home = mkdtempSync(join(tmpdir(), 'keyrack-legacy-rawssh-'));
        const homeBefore = process.env.HOME;
        process.env.HOME = home;

        // a real PASSPHRASED ed25519 key — the shape a pre-feature init sealed raw-ssh
        const passphrase = 'test-passphrase-123';
        const { keyPath } = genSampleEphemeralSshKey({
          dir: home,
          keyName: 'id_probe',
          passphrase,
          comment: 'probe',
        });

        // seal a REAL manifest plaintext to the RAW ssh recipient (mech 'ssh' → age cli
        // → `-> ssh-ed25519` stanza) — the exact v0 on-disk shape
        const pubkey = getOneSshPubkey({ keyPath });
        const plaintext = 'legacy-manifest-plaintext';
        const ciphertext = await encryptToRecipients({
          plaintext,
          recipients: [
            {
              mech: 'ssh',
              pubkey,
              label: 'default',
              addedAt: '2026-07-24T00:00:00Z',
            },
          ],
        });
        const manifestPath = getKeyrackHostManifestPath({
          owner: 'ehmpath-rawssh',
        });
        mkdirSync(dirname(manifestPath), { recursive: true });
        writeFileSync(manifestPath, ciphertext, 'utf8');

        // scripted askpass echoes the passphrase (stands in for the gnome dialog);
        // KEYRACK_ASKPASS makes it authoritative, so the strip runs headlessly
        const { path: askpass } = genSampleAskpassDialog({
          path: join(home, 'gnome-ssh-askpass'),
          passphrase,
        });

        return { home, homeBefore, keyPath, askpass, plaintext, ciphertext };
      });

      afterAll(() => {
        process.env.HOME = scene.homeBefore;
        rmSync(scene.home, { recursive: true, force: true });
      });

      when('[t0] getOne is called with the ed25519 key as --prikey', () => {
        then(
          'it returns the age-cli marker for the key (the legacy tier fired)',
          async () => {
            const context = genContextKeyrack({
              owner: 'ehmpath-rawssh',
              prikeys: [scene.keyPath],
            });
            const identity = await context.identity.getOne({ for: 'manifest' });
            expect(identity).not.toBeNull();
            // the legacy tier returns SSH_KEY_PATH_MARKER + <key path>, NOT an
            // AGE-SECRET-KEY — proof getOne routed to the age-cli decrypt path
            expect(identity!.startsWith(SSH_KEY_PATH_MARKER)).toBe(true);
          },
        );

        then(
          'that marker decrypts the raw-ssh manifest (strip via dialog + age -d -i)',
          async () => {
            const context = genContextKeyrack({
              owner: 'ehmpath-rawssh',
              prikeys: [scene.keyPath],
            });
            const identity = await context.identity.getOne({ for: 'manifest' });

            const askpassBefore = process.env.KEYRACK_ASKPASS;
            process.env.KEYRACK_ASKPASS = scene.askpass;
            try {
              const decrypted = await decryptWithIdentity({
                ciphertext: scene.ciphertext,
                identity: identity!,
                owner: 'ehmpath-rawssh',
              });
              expect(decrypted).toEqual(scene.plaintext);
            } finally {
              process.env.KEYRACK_ASKPASS = askpassBefore;
            }
          },
        );
      });
    },
  );
});
