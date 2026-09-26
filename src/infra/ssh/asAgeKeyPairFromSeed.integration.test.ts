import { given, then, useBeforeAll, when } from 'test-fns';

import { KeyrackKeyRecipient } from '@src/domain.objects/keyrack';

import { randomBytes } from 'node:crypto';
import {
  asAgeKeyPairFromSeed,
  decryptWithIdentity,
  encryptToRecipients,
} from './ageRecipientCrypto';

/**
 * .what = prove the derive-not-store keystone: a 32-byte seed derives an age
 *         keypair K deterministically, the same seed always re-derives the SAME K,
 *         and a manifest encrypted to K's recipient decrypts with the re-derived K
 * .why  = this is the crux the whole corrected vision rests on — if the seed→K
 *         derivation is deterministic and roundtrips through real age, then unlock
 *         can re-derive K from the agent signature instead of a stored K secret
 *         (the `wrapped-identity.age` sidecar the wisher rejected)
 *
 * .note = integration: exercises the real `age-encryption` library end-to-end
 */
describe('asAgeKeyPairFromSeed (derive-not-store keystone)', () => {
  const scene = useBeforeAll(async () => {
    // a fixed 32-byte seed stands in for HKDF(agent.sign(challenge))
    const seed = new Uint8Array(randomBytes(32));
    return { seed };
  });

  given('[case1] a fixed 32-byte seed', () => {
    when('[t0] the keypair is derived twice from the same seed', () => {
      const pairs = useBeforeAll(async () => ({
        first: await asAgeKeyPairFromSeed({ seed: scene.seed }),
        second: await asAgeKeyPairFromSeed({ seed: scene.seed }),
      }));

      then(
        'the derivation is deterministic (same identity + recipient)',
        () => {
          expect(pairs.first.identity).toEqual(pairs.second.identity);
          expect(pairs.first.recipient).toEqual(pairs.second.recipient);
        },
      );

      then('it yields a real age identity + recipient', () => {
        expect(pairs.first.identity.startsWith('AGE-SECRET-KEY-')).toBe(true);
        expect(pairs.first.recipient.startsWith('age1')).toBe(true);
      });
    });

    when('[t1] a manifest is encrypted to the derived recipient', () => {
      const roundtrip = useBeforeAll(async () => {
        // init side: derive K, encrypt the plaintext to K's recipient
        const kAtInit = await asAgeKeyPairFromSeed({ seed: scene.seed });
        const ciphertext = await encryptToRecipients({
          plaintext: 'the-host-manifest-plaintext',
          recipients: [
            new KeyrackKeyRecipient({
              mech: 'age',
              pubkey: kAtInit.recipient,
              label: 'default',
              addedAt: new Date().toISOString(),
            }),
          ],
        });

        // unlock side: RE-DERIVE K from the same seed, decrypt
        const kAtUnlock = await asAgeKeyPairFromSeed({ seed: scene.seed });
        const plaintext = await decryptWithIdentity({
          ciphertext,
          identity: kAtUnlock.identity,
        });
        return { plaintext };
      });

      then(
        'the re-derived K decrypts it (full derive-not-store roundtrip)',
        () => {
          expect(roundtrip.plaintext).toEqual('the-host-manifest-plaintext');
        },
      );
    });
  });

  given('[case2] two different seeds', () => {
    when('[t0] a keypair is derived from each', () => {
      const pairs = useBeforeAll(async () => ({
        a: await asAgeKeyPairFromSeed({
          seed: new Uint8Array(randomBytes(32)),
        }),
        b: await asAgeKeyPairFromSeed({
          seed: new Uint8Array(randomBytes(32)),
        }),
      }));

      then('they derive distinct identities (no cross-seed collision)', () => {
        expect(pairs.a.identity).not.toEqual(pairs.b.identity);
        expect(pairs.a.recipient).not.toEqual(pairs.b.recipient);
      });
    });
  });
});
