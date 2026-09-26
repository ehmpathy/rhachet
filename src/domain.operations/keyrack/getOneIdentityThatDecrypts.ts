import { AgeIdentityMissError } from '@src/infra/ssh/AgeIdentityMissError';
import { decryptWithIdentity } from '@src/infra/ssh/ageRecipientCrypto';

/**
 * .what = find the first identity in a pool that decrypts the ciphertext, and the
 *         plaintext it recovers
 * .why = the ONE trial-decrypt loop shared by manifest unlock (trialDecryptManifest)
 *        and roundtrip verify (verifyRoundtripDecryption). the two had drifted into
 *        separate copies — one hardened against failhide, one not — which brought a
 *        fixed defect back. unify so the allowlist lives in exactly one place
 *
 * .note = allowlists ONLY the EXPECTED wrong-identity failure, surfaced by BOTH
 *         decrypt paths as an AgeIdentityMissError; that is the normal "try the next
 *         identity" case. any OTHER error (an I/O fault, a corrupt ciphertext, an
 *         upstream bug) is a genuine fault and surfaces loud, never masked as "not
 *         this identity" (rule.forbid.failhide). the `instanceof` allowlist (not a
 *         message string) holds across jest module realms since keyrack mints the
 *         error in its own realm
 * .note = a ciphertext has exactly one plaintext, so the first identity that
 *         decrypts yields the definitive plaintext — returned so a caller that must
 *         compare it (roundtrip verify) needs no second decrypt
 */
export const getOneIdentityThatDecrypts = async (input: {
  ciphertext: string | Uint8Array;
  pool: string[];
  owner?: string | null;
}): Promise<{ identity: string; plaintext: string } | null> => {
  // try each identity until one decrypts
  for (const identity of input.pool) {
    try {
      const plaintext = await decryptWithIdentity({
        ciphertext: input.ciphertext,
        identity,
        owner: input.owner ?? null,
      });
      return { identity, plaintext };
    } catch (error) {
      // swallow ONLY the one expected wrong-identity miss; rethrow all else
      if (!(error instanceof AgeIdentityMissError)) throw error;
    }
  }

  // no identity in the pool could decrypt
  return null;
};
