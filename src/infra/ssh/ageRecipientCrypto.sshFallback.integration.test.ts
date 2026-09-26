import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleAskpassDialog } from '@src/.test/assets/genSampleAskpassDialog';
import { genSampleRsaKey } from '@src/.test/assets/genSampleRsaKey';
import { getOneIdentityThatDecrypts } from '@src/domain.operations/keyrack/getOneIdentityThatDecrypts';
import { SSH_KEY_PATH_MARKER } from '@src/infra/ssh/asSshKeyPathMarker';
import { sshPrikeyToAgeIdentity } from '@src/infra/ssh/sshPrikeyToAgeIdentity';

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  decryptWithIdentity,
  encryptToRecipients,
  generateAgeKeyPair,
} from './ageRecipientCrypto';

/**
 * .what = prove the non-ed25519 (rsa) age-CLI FALLBACK end-to-end: a manifest
 *         encrypted to a raw ssh-rsa recipient (mech 'ssh') roundtrips back through
 *         a real `age -d -i <rsa-key>` — the exact path vision q4 scoped out of
 *         Variant A but keeps live for rsa users (see decryptWithAgeCLI .why-retained)
 * .why  = this fallback was the single largest UNTESTED live path (r10/r11): every
 *         extant test exercised only the npm-library mech 'age' X25519 path, never a
 *         real ssh-recipient roundtrip through the `age` binary with a non-ed25519
 *         key. this pins it (rule.require.test-covered-repairs)
 *
 * .note = integration (spawns ssh-keygen + the real `age` binary, touches a temp
 *         dir); self-isolated — own throwaway keys, never the host's ~/.ssh
 * .note = a PASSWORDLESS rsa key roundtrips directly (age -d needs no passphrase);
 *         a PASSPHRASED rsa key roundtrips too — keyrack strips its passphrase via
 *         the gnome dialog (asDecryptedSshKeyCopy) before age, so it never reaches
 *         age's tty prompt. the dialog is a scripted askpass injected via
 *         KEYRACK_ASKPASS (getOneAskpassDialog treats it as authoritative), so the
 *         passphrased roundtrip is now driven hermetically — no /dev/tty dependency
 * .note = age supports ssh-rsa + ssh-ed25519 keys, NOT ecdsa — so ecdsa has no age
 *         roundtrip to pin; rsa is the achievable, real non-ed25519 fallback
 */
describe('ageRecipientCrypto — ssh (non-ed25519) age-CLI fallback', () => {
  const scene = useBeforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kr-sshfallback-'));

    // a passwordless rsa key — its `age -d -i` decrypt needs no interactive prompt
    const { path: rsaPath } = genSampleRsaKey({ keyPath: join(dir, 'id_rsa') });
    const rsaPubkey = readFileSync(`${rsaPath}.pub`, 'utf8').trim();

    // a passphrase-protected rsa key — for the route-to-fallback assertion AND the
    // full passphrased roundtrip (its passphrase is stripped via the scripted dialog)
    const rsaLockedPassphrase = 'test-pass';
    const { path: rsaLockedPath } = genSampleRsaKey({
      keyPath: join(dir, 'id_rsa_locked'),
      passphrase: rsaLockedPassphrase,
    });
    const rsaLockedPubkey = readFileSync(`${rsaLockedPath}.pub`, 'utf8').trim();

    // a scripted askpass that echoes the passphrase — stands in for the gnome dialog
    // ssh-keygen -p invokes under SSH_ASKPASS_REQUIRE=force. injected via
    // KEYRACK_ASKPASS so getOneAskpassDialog treats it as the authoritative dialog,
    // which drives the passphrased strip hermetically (no /dev/tty)
    const { path: askpass } = genSampleAskpassDialog({
      path: join(dir, 'gnome-ssh-askpass'),
      passphrase: rsaLockedPassphrase,
    });

    return { rsaPath, rsaPubkey, rsaLockedPath, rsaLockedPubkey, askpass };
  });

  given(
    '[case1] a manifest encrypted to a passwordless rsa ssh recipient',
    () => {
      when('[t0] it is decrypted with the rsa key via the age fallback', () => {
        then('the plaintext roundtrips byte-for-byte', async () => {
          const plaintext = 'keyrack manifest\nwith newlines\nand unicode: 🐢';

          // encrypt: a mech 'ssh' recipient goes through the age CLI (age -r <pub>)
          const ciphertext = await encryptToRecipients({
            plaintext,
            recipients: [
              {
                mech: 'ssh',
                pubkey: scene.rsaPubkey,
                label: 'rsa-fallback',
                addedAt: '',
              },
            ],
          });

          // the age CLI produces an armored ssh-stanza ciphertext, not an X25519 one
          expect(ciphertext).toMatch(/^-----BEGIN AGE ENCRYPTED FILE-----/);

          // decrypt: the SSH_KEY_PATH marker goes to `age -d -i <rsa-key>`; a
          // passwordless key needs no prompt, so this completes non-interactively
          const decrypted = await decryptWithIdentity({
            ciphertext,
            identity: `${SSH_KEY_PATH_MARKER}${scene.rsaPath}`,
          });

          expect(decrypted).toEqual(plaintext);
        });
      });
    },
  );

  given(
    '[case2] a passphrase-protected rsa key, with the age cli present',
    () => {
      when('[t0] its identity is derived', () => {
        then(
          'it routes to the age fallback (SSH_KEY_PATH marker), not a failure',
          () => {
            // a passphrased non-ed25519 key cannot convert in-process; with age present
            // it must route to the age CLI via the marker — the live rsa fallback path
            const identity = sshPrikeyToAgeIdentity({
              keyPath: scene.rsaLockedPath,
            });
            expect(identity.startsWith(SSH_KEY_PATH_MARKER)).toBe(true);
            expect(identity).toContain(scene.rsaLockedPath);
          },
        );
      });
    },
  );

  given(
    '[case3] a pooled ssh key (age-CLI path) that is NOT a recipient of the ciphertext',
    () => {
      // this pins the age-CLI wrong-identity re-map: a Variant A K-sealed manifest,
      // or any manifest a pooled ssh key does not seal, makes `age -d -i <key>` exit
      // non-zero with "no identity matched any of the recipients". that is the SAME
      // "try the next identity" miss the age library raises — so the shared trial
      // loop must SWALLOW it and fall through, never crash on the CLI phrase
      const scene3 = useBeforeAll(async () => {
        // encrypt to a DIFFERENT recipient (an age X25519 key), so the rsa key below
        // is genuinely not a recipient of this ciphertext
        const other = await generateAgeKeyPair();
        const ciphertext = await encryptToRecipients({
          plaintext: 'sealed-to-someone-else',
          recipients: [
            {
              mech: 'age',
              pubkey: other.recipient,
              label: 'other',
              addedAt: '2026-07-26T00:00:00Z',
            },
          ],
        });
        return { ciphertext };
      });

      when('[t0] the pool holds only that non-recipient ssh key', () => {
        then(
          'the wrong-identity miss is swallowed → null (no crash)',
          async () => {
            // the passwordless rsa key routes through `age -d -i` (SSH_KEY_PATH marker)
            // and is not a recipient → age exits with the CLI wrong-identity error,
            // which is now re-mapped to the canonical miss and swallowed by the loop
            const found = await getOneIdentityThatDecrypts({
              ciphertext: scene3.ciphertext,
              pool: [`${SSH_KEY_PATH_MARKER}${scene.rsaPath}`],
            });
            expect(found).toBeNull();
          },
        );
      });
    },
  );

  given(
    '[case4] a pooled ssh key path that does not exist — a genuine fault',
    () => {
      // the re-map stays NARROW: only the wrong-identity miss is swallowed. an
      // absent key file is a real fault (age cannot read the identity) and MUST
      // surface loud, never be masked as a fall-through (rule.forbid.failhide)
      const scene4 = useBeforeAll(async () => {
        const target = await generateAgeKeyPair();
        const ciphertext = await encryptToRecipients({
          plaintext: 'sealed',
          recipients: [
            {
              mech: 'age',
              pubkey: target.recipient,
              label: 'target',
              addedAt: '2026-07-26T00:00:00Z',
            },
          ],
        });
        return { ciphertext };
      });

      when('[t0] the pool holds an ssh marker to an absent key file', () => {
        then('the genuine fault fails loud, never a masked null', async () => {
          const error = await getError(
            getOneIdentityThatDecrypts({
              ciphertext: scene4.ciphertext,
              pool: [
                `${SSH_KEY_PATH_MARKER}${join(scene.rsaPath, 'no-such-key')}`,
              ],
            }),
          );
          // a fault surfaced (not a swallowed null). assert on the message rather
          // than `instanceof Error`: the node child_process error crosses realms,
          // where an instanceof check is unreliable — the message read is not
          expect(error).toBeTruthy();
          // NOT the tolerated wrong-identity miss — a genuine fault surfaced
          expect(error.message).not.toContain(
            "no identity matched any of the file's recipients",
          );
        });
      });
    },
  );

  given(
    '[case5] a manifest encrypted to a PASSPHRASED rsa ssh recipient',
    () => {
      // the r10 blocker made buildable: the original wish complained the passphrase
      // prompt was garbled over a piped `age -d`. for a passphrased rsa/ecdsa key
      // keyrack now strips the passphrase via the gnome dialog (asDecryptedSshKeyCopy)
      // BEFORE age, so age never reaches its tty prompt. proven end-to-end here with a
      // scripted askpass — the passphrased roundtrip the old note called undrivable
      when(
        '[t0] it is decrypted with the passphrased rsa key via the dialog-strip fallback',
        () => {
          then('the plaintext roundtrips byte-for-byte', async () => {
            const plaintext = 'keyrack manifest\npassphrased rsa: 🐢';

            // encrypt to the LOCKED rsa key's pubkey (mech 'ssh' → age -r)
            const ciphertext = await encryptToRecipients({
              plaintext,
              recipients: [
                {
                  mech: 'ssh',
                  pubkey: scene.rsaLockedPubkey,
                  label: 'rsa-locked',
                  addedAt: '',
                },
              ],
            });

            // point KEYRACK_ASKPASS at the scripted dialog so getOneAskpassDialog (inside
            // decryptWithAgeCLI) resolves it authoritatively; ssh-keygen -p reads the
            // passphrase from it under SSH_ASKPASS_REQUIRE=force — never /dev/tty.
            // restore in finally so no env leaks to sibling tests (immutable-vars intent)
            const askpassBefore = process.env.KEYRACK_ASKPASS;
            process.env.KEYRACK_ASKPASS = scene.askpass;
            try {
              const decrypted = await decryptWithIdentity({
                ciphertext,
                identity: `${SSH_KEY_PATH_MARKER}${scene.rsaLockedPath}`,
              });
              expect(decrypted).toEqual(plaintext);
            } finally {
              if (askpassBefore === undefined)
                delete process.env.KEYRACK_ASKPASS;
              else process.env.KEYRACK_ASKPASS = askpassBefore;
            }
          });
        },
      );
    },
  );

  given(
    '[case6] a PASSPHRASED rsa key on a HEADLESS session (no display, no KEYRACK_ASKPASS)',
    () => {
      // the r10 i039 blocker made buildable: the ed25519 path
      // (withKeyrackWrapKeyViaAgent) fails fast on a headless box with the DEDICATED
      // asHeadlessSessionMessage; the rsa/ecdsa path lacked that guard, so a headless
      // rsa user fell through to ssh-keygen -p and got the merged three-cause message.
      // this pins the guard: a passphrased rsa key with no display AND no supplied
      // dialog must throw the SAME dedicated headless guidance, BEFORE the strip
      when(
        '[t0] a passphrased rsa decrypt is attempted with no way to prompt',
        () => {
          then(
            'it fails fast with the dedicated headless guidance (not the merged three-cause message)',
            async () => {
              const plaintext = 'headless rsa should never get this far';
              const ciphertext = await encryptToRecipients({
                plaintext,
                recipients: [
                  {
                    mech: 'ssh',
                    pubkey: scene.rsaLockedPubkey,
                    label: 'rsa-locked-headless',
                    addedAt: '',
                  },
                ],
              });

              // simulate a headless box: clear both display vars AND KEYRACK_ASKPASS, so
              // isGraphicalSessionPresent() is false and no dialog is supplied. restore
              // all three in finally so no env leaks to neighbor tests (immutable-vars intent)
              const displayBefore = process.env.DISPLAY;
              const waylandBefore = process.env.WAYLAND_DISPLAY;
              const askpassBefore = process.env.KEYRACK_ASKPASS;
              delete process.env.DISPLAY;
              delete process.env.WAYLAND_DISPLAY;
              delete process.env.KEYRACK_ASKPASS;
              try {
                const error = await getError(
                  decryptWithIdentity({
                    ciphertext,
                    identity: `${SSH_KEY_PATH_MARKER}${scene.rsaLockedPath}`,
                  }),
                );
                expect(error).toBeTruthy();
                // the dedicated headless guidance — names the ONE real cause (no display)
                // and the two real fixes (local desktop, or passphrase-less key)
                expect(error.message).toContain('no display');
                expect(error.message).toContain('local desktop session');
                // NOT the merged three-cause ssh-keygen strip message (wrong / cancelled
                // / no graphical session) — the guard fires BEFORE the strip runs
                expect(error.message).not.toContain('was wrong or cancelled');
              } finally {
                if (displayBefore === undefined) delete process.env.DISPLAY;
                else process.env.DISPLAY = displayBefore;
                if (waylandBefore === undefined)
                  delete process.env.WAYLAND_DISPLAY;
                else process.env.WAYLAND_DISPLAY = waylandBefore;
                if (askpassBefore === undefined)
                  delete process.env.KEYRACK_ASKPASS;
                else process.env.KEYRACK_ASKPASS = askpassBefore;
              }
            },
          );
        },
      );
    },
  );
});
