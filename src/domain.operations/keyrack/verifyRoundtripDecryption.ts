import { decryptWithIdentity } from '@src/domain.operations/keyrack/adapters/ageRecipientCrypto';
import { discoverIdentities } from '@src/domain.operations/keyrack/discoverIdentities';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { getAllAgeIdentitiesForKeyPaths } from '@src/domain.operations/keyrack/getAllAgeIdentitiesForKeyPaths';
import { isExpectedCryptoMiss } from '@src/domain.operations/keyrack/isExpectedCryptoMiss';

/**
 * .what = verify roundtrip decryption of encrypted content
 * .why = ensures credential can be decrypted by at least one available identity
 *
 * .note = tries all identities from context (prescribed + discovered)
 * .note = returns true if any identity successfully decrypts to expected plaintext
 * .note = getOneAgeIdentityOrNull skips a per-key parse miss but rethrows a broken crypto load (e6)
 */
export const verifyRoundtripDecryption = async (
  input: {
    expected: { ciphertext: string; plaintext: string };
    owner: string | null;
  },
  context?: ContextKeyrack,
): Promise<{ verified: boolean }> => {
  // build identity pool from context (prescribed + discovered)
  const prescribedKeyPaths = context?.identity?.getAll.prescribed ?? [];
  const prescribedIdentities = await getAllAgeIdentitiesForKeyPaths({
    keyPaths: prescribedKeyPaths,
  });

  const discoveredIdentities = context?.identity?.getAll.discovered
    ? await context.identity.getAll.discovered()
    : await discoverIdentities({ owner: input.owner });

  const identityPool = [...prescribedIdentities, ...discoveredIdentities];

  // try each identity until one decrypts successfully
  for (const identity of identityPool) {
    try {
      const decrypted = await decryptWithIdentity({
        ciphertext: input.expected.ciphertext,
        identity,
      });
      if (decrypted === input.expected.plaintext) {
        return { verified: true };
      }
    } catch (error) {
      // rethrow any rhachet-native error (broken crypto load, code defect) — fail loud (e6)
      if (!isExpectedCryptoMiss(error)) throw error;

      // expected: decryption failure with wrong identity (continue to next)
      // .note = age-encryption throws generic Error for decryption failures
    }
  }

  return { verified: false };
};
