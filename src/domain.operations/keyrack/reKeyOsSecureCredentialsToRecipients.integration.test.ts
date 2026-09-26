import * as age from 'age-encryption';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';
import { genSampleEphemeralSshKey } from '@src/.test/assets/genSampleEphemeralSshKey';
import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import { KeyrackKeyRecipient } from '@src/domain.objects/keyrack';
import { getOsSecureCredentialPath } from '@src/domain.operations/keyrack/adapters/vaults/os.secure/vaultAdapterOsSecure';
import {
  decryptWithIdentity,
  encryptToRecipients,
} from '@src/infra/ssh/ageRecipientCrypto';
import { asAgeRecipientFromSshPubkey } from '@src/infra/ssh/asAgeRecipientFromSshPubkey';
import { getOneSshPubkey } from '@src/infra/ssh/getOneSshPubkey';

import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { genContextKeyrack } from './genContextKeyrack';
import { reKeyOsSecureCredentialsToRecipients } from './reKeyOsSecureCredentialsToRecipients';

/**
 * .what = the brick regression (rule.require.os-secure-seals-to-host-manifest): an
 *         os.secure credential sealed to the OLD recipient A is re-keyed to the NEW
 *         recipient B, and afterward it opens with B and NO LONGER with A
 * .why  = this is the exact gap that shipped the 2026-07-30 brick — a migration re-
 *         sealed the manifest to K but left the os.secure blob on the old recipient, so
 *         the next fresh unlock opened the manifest then failed on the first credential.
 *         this test seals a real os.secure blob to the old recipient and proves the
 *         re-key carries it to the new one (the invariant's mandated coverage)
 *
 * .note = integration (real age library, real fs); HOME-isolated temp dir. a passwordless
 *         ed25519 key is the SESSION identity — it converts in-process (no prompt), so
 *         the re-key runs headlessly and isolates exactly the seal-carry behavior
 */
describe('reKeyOsSecureCredentialsToRecipients (os.secure brick regression)', () => {
  const scene = useBeforeAll(async () => {
    const home = mkdtempSync(join(tmpdir(), 'kr-rekey-'));
    const originalHome = process.env.HOME;
    process.env.HOME = home;

    const owner = 'ehmpath-rekey';
    const slug = 'testorg.test.API_KEY';

    // a passwordless ed25519 key = recipient A's identity (converts in-process)
    const { keyPath } = genSampleEphemeralSshKey({
      dir: home,
      keyName: 'id_a',
      comment: 'a',
    });
    const pubkey = getOneSshPubkey({ keyPath });
    const recipientA = asAgeRecipientFromSshPubkey({ pubkey });

    // the manifest sealed to recipient A, with one os.secure host
    const manifest = genMockKeyrackHostManifest({
      owner,
      recipients: [
        new KeyrackKeyRecipient({
          mech: 'age',
          pubkey: recipientA,
          label: 'default',
          addedAt: new Date().toISOString(),
        }),
      ],
      hosts: { [slug]: { vault: 'os.secure' } },
    });
    await daoKeyrackHostManifest.set({ upsert: manifest });

    // the os.secure credential blob, sealed to recipient A (as vaultAdapterOsSecure.set
    // would seal it — to the manifest recipients)
    const secret = 'super-secret-cred-value';
    const blobPath = getOsSecureCredentialPath({ slug, owner });
    mkdirSync(dirname(blobPath), { recursive: true });
    const ciphertextA = await encryptToRecipients({
      plaintext: secret,
      recipients: [
        new KeyrackKeyRecipient({
          mech: 'age',
          pubkey: recipientA,
          label: 'default',
          addedAt: new Date().toISOString(),
        }),
      ],
    });
    writeFileSync(blobPath, ciphertextA, 'utf8');

    // recipient B = a fresh age identity, the stand-in for the migration's derived K
    const identityB = await age.generateIdentity();
    const recipientB = await age.identityToRecipient(identityB);

    return {
      home,
      originalHome,
      owner,
      slug,
      keyPath,
      manifest,
      secret,
      blobPath,
      identityB,
      recipientB,
    };
  });

  afterAll(() => {
    process.env.HOME = scene.originalHome;
  });

  given(
    '[case1] an os.secure blob sealed to recipient A + a manifest that opens with A',
    () => {
      when('[t0] the blob is re-keyed to recipient B', () => {
        const result = useBeforeAll(async () => {
          const context = genContextKeyrack({
            owner: scene.owner,
            prikeys: [scene.keyPath],
          });
          return reKeyOsSecureCredentialsToRecipients(
            {
              owner: scene.owner,
              manifest: scene.manifest,
              recipients: [
                new KeyrackKeyRecipient({
                  mech: 'age',
                  pubkey: scene.recipientB,
                  label: 'default',
                  addedAt: new Date().toISOString(),
                }),
              ],
            },
            context,
          );
        });

        then('the slug is reported re-keyed', () => {
          expect(result.rekeyed).toEqual([scene.slug]);
        });

        then(
          'the blob now opens with recipient B and yields the secret',
          async () => {
            const decrypted = await decryptWithIdentity({
              ciphertext: readFileSync(scene.blobPath, 'utf8'),
              identity: scene.identityB,
            });
            expect(decrypted).toEqual(scene.secret);
          },
        );

        then(
          'the blob NO LONGER opens with recipient A (the brick this prevents)',
          async () => {
            // recipient A's identity — the session identity that opened the manifest
            const context = genContextKeyrack({
              owner: scene.owner,
              prikeys: [scene.keyPath],
            });
            const identityA = await context.identity.getOne({
              for: 'manifest',
            });
            expect(identityA).not.toBeNull();

            // after the re-key the old recipient can no longer open the blob — else
            // the manifest could move to K while the credential stayed on A (the brick)
            const error = await getError(
              decryptWithIdentity({
                ciphertext: readFileSync(scene.blobPath, 'utf8'),
                identity: identityA!,
              }),
            );
            expect(error).not.toBeNull();
          },
        );
      });
    },
  );

  given(
    '[case2] an os.secure blob that CANNOT be decrypted with the session identity',
    () => {
      // the r10 i039 blocker #4: a genuinely undecryptable os.secure blob mid-re-key must
      // surface a KEYRACK-authored, fix-naming error — not a raw age-library string. this
      // seals a blob to a DIFFERENT recipient than the session identity (a prior desync),
      // so decryptWithIdentity faults, and asserts the human-facing quality of what
      // surfaces (rule.require.errors-name-the-fix)
      const scene2 = useBeforeAll(async () => {
        const home = mkdtempSync(join(tmpdir(), 'kr-rekey-corrupt-'));
        const originalHome = process.env.HOME;
        process.env.HOME = home;

        const owner = 'ehmpath-rekey-corrupt';
        const slug = 'testorg.test.DESYNCED_KEY';

        // the SESSION identity — a passwordless ed25519 key that opens the manifest
        const { keyPath } = genSampleEphemeralSshKey({
          dir: home,
          keyName: 'id_session',
          comment: 'session',
        });
        const pubkey = getOneSshPubkey({ keyPath });
        const recipientSession = asAgeRecipientFromSshPubkey({ pubkey });

        const manifest = genMockKeyrackHostManifest({
          owner,
          recipients: [
            new KeyrackKeyRecipient({
              mech: 'age',
              pubkey: recipientSession,
              label: 'default',
              addedAt: new Date().toISOString(),
            }),
          ],
          hosts: { [slug]: { vault: 'os.secure' } },
        });
        await daoKeyrackHostManifest.set({ upsert: manifest });

        // seal the blob to a STRANGER recipient the session identity does not hold — the
        // exact desync shape: the manifest opens with the session identity, this blob does
        // NOT. the re-key's decrypt step will fault on it
        const stranger = await age.generateIdentity();
        const strangerRecipient = await age.identityToRecipient(stranger);
        const blobPath = getOsSecureCredentialPath({ slug, owner });
        mkdirSync(dirname(blobPath), { recursive: true });
        const ciphertextStranger = await encryptToRecipients({
          plaintext: 'unreachable-secret',
          recipients: [
            new KeyrackKeyRecipient({
              mech: 'age',
              pubkey: strangerRecipient,
              label: 'stranger',
              addedAt: new Date().toISOString(),
            }),
          ],
        });
        writeFileSync(blobPath, ciphertextStranger, 'utf8');

        const targetRecipient = await age.identityToRecipient(
          await age.generateIdentity(),
        );

        return {
          home,
          originalHome,
          owner,
          slug,
          keyPath,
          manifest,
          blobPath,
          targetRecipient,
        };
      });

      afterAll(() => {
        process.env.HOME = scene2.originalHome;
      });

      when('[t0] the re-key runs over the undecryptable blob', () => {
        const outcome = useBeforeAll(async () => {
          const context = genContextKeyrack({
            owner: scene2.owner,
            prikeys: [scene2.keyPath],
          });
          const error = await getError(
            reKeyOsSecureCredentialsToRecipients(
              {
                owner: scene2.owner,
                manifest: scene2.manifest,
                recipients: [
                  new KeyrackKeyRecipient({
                    mech: 'age',
                    pubkey: scene2.targetRecipient,
                    label: 'default',
                    addedAt: new Date().toISOString(),
                  }),
                ],
              },
              context,
            ),
          );
          return { error };
        });

        then('it fails loud (never a swallowed pass)', () => {
          expect(outcome.error).not.toBeNull();
        });

        then(
          'the error NAMES the exact blob that could not be re-keyed',
          () => {
            expect(outcome.error.message).toContain(
              'could not re-key the os.secure credential',
            );
            expect(outcome.error.message).toContain(scene2.slug);
          },
        );

        then(
          'the error is keyrack-authored + names the fix (not a raw age string)',
          () => {
            // the human-facing quality the reviewer asked for: a fix, not a symptom.
            // the hint names the re-fill command, so the human has a concrete next move
            const hint = (
              outcome.error as unknown as { metadata?: { hint?: string } }
            ).metadata?.hint;
            expect(hint).toBeTruthy();
            expect(hint).toContain('rhx keyrack fill');
            // and it must NOT surface the bare age-library phrase as the whole message
            expect(outcome.error.message).not.toEqual(
              "no identity matched any of the file's recipients",
            );
          },
        );
      });
    },
  );

  given(
    '[case3] os.secure work is owed but NO session identity is available',
    () => {
      // the r11 i057 failhide clamp: we are PAST the `slugsOsSecure.length === 0`
      // guard (the manifest HAS an os.secure host), so real re-key work is owed. a
      // null session identity here means the blobs cannot be decrypted — a silent
      // `return { rekeyed: [] }` would let the caller persist the new manifest as if
      // every credential were re-keyed, so manifest and blobs desync (the brick).
      // this clamp forces getOne → null with work owed and asserts a LOUD throw
      // (rule.forbid.failhide). it goes RED under the old silent-return, GREEN under
      // the MalfunctionError
      when('[t0] the re-key runs with a null-identity context', () => {
        const outcome = useBeforeAll(async () => {
          // a real context, then override identity.getOne → null (the invariant break
          // the branch guards). the manifest still carries an os.secure host, so the
          // length guard passes and the null-identity branch is the one reached
          const baseContext = genContextKeyrack({
            owner: scene.owner,
            prikeys: [scene.keyPath],
          });
          const context = {
            ...baseContext,
            identity: {
              ...baseContext.identity,
              /**
               * .mock = context.identity.getOne → always null
               * .why = the branch under test fires ONLY when work is owed yet no session
               *        identity opened the manifest — an invariant break the real getOne
               *        cannot produce hermetically (a real context that reached this call
               *        HAS an identity, or it never got past manifest decrypt). so the
               *        null identity is forced here to exercise the failhide clamp; it is
               *        a deliberate branch-forcer, not a drift-prone service double
               * .real = the happy-path (a real, present identity) is proven by case1/case2
               *         above, which run the true getOne end-to-end
               */
              getOne: async (): Promise<string | null> => null,
            },
          };
          const error = await getError(
            reKeyOsSecureCredentialsToRecipients(
              {
                owner: scene.owner,
                manifest: scene.manifest,
                recipients: [
                  new KeyrackKeyRecipient({
                    mech: 'age',
                    pubkey: scene.recipientB,
                    label: 'default',
                    addedAt: new Date().toISOString(),
                  }),
                ],
              },
              context,
            ),
          );
          return { error };
        });

        then('it throws rather than a silent empty-success return', () => {
          expect(outcome.error).not.toBeNull();
        });

        then(
          'the error names the absent session identity + the owed work',
          () => {
            expect(outcome.error.message).toContain(
              'no session identity is available to decrypt them',
            );
            // the metadata carries the slugs that were owed a re-key — proof this was
            // NOT the benign length===0 case, but the failhide branch with work owed
            const slugsOsSecure = (
              outcome.error as unknown as {
                metadata?: { slugsOsSecure?: string[] };
              }
            ).metadata?.slugsOsSecure;
            expect(slugsOsSecure).toContain(scene.slug);
          },
        );
      });
    },
  );
});
