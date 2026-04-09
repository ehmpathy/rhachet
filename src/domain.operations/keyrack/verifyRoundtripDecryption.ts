import { decryptWithIdentity } from '@src/domain.operations/keyrack/adapters/ageRecipientCrypto';
import { discoverIdentities } from '@src/domain.operations/keyrack/discoverIdentities';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { sshPrikeyToAgeIdentity } from '@src/infra/ssh';

/**
 * .what = verify roundtrip decryption of encrypted content
 * .why = ensures credential can be decrypted by at least one available identity
 *
 * .note = tries all identities from context (prescribed + discovered)
 * .note = returns true if any identity successfully decrypts to expected plaintext
 */
export const verifyRoundtripDecryption = async (
  input: {
    expected: { ciphertext: string; plaintext: string };
    owner: string | null;
  },
  context?: ContextKeyrack,
): Promise<{ verified: boolean }> => {
  // build identity pool from context (prescribed + discovered)
  const prescribedIdentities = (context?.identity?.getAll.prescribed ?? [])
    .map((keyPath) => {
      try {
        return sshPrikeyToAgeIdentity({ keyPath });
      } catch {
        return null;
      }
    })
    .filter((id): id is string => id !== null);

  const discoveredIdentities = context?.identity?.getAll.discovered
    ? await context.identity.getAll.discovered()
    : discoverIdentities({ owner: input.owner });

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
    } catch {
      // continue to next identity
    }
  }

  return { verified: false };
};
