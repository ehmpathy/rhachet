import { asAgeKeyPairFromSeed } from '@src/infra/ssh/ageRecipientCrypto';
import type { KeyrackUnlockAttribution } from '@src/infra/ssh/asUnlockPromptMessage';

import { withKeyrackWrapKeyViaAgent } from './withKeyrackWrapKeyViaAgent';

/**
 * .what = derive the manifest age keypair K via the ephemeral sign-as-KDF path — returns
 *         BOTH its secret identity (to decrypt with, unlock side) and its public recipient
 *         (to seal to, init side)
 * .why  = the derive-not-store core (vision q1): a passphrased ssh key signs the challenge,
 *         that signature seeds K, and K is the manifest keypair. one op serves both sides —
 *         the unlock caller projects `.identity` to open the manifest, the init/migrate
 *         caller projects `.recipient` to seal it — so there is a single derivation path,
 *         not two near-identical wrappers that could drift
 *
 * .note = K is DERIVED from the signature seed, never unwrapped from a stored secret — the
 *         same seed that init sealed to always re-derives the same K. so there is no
 *         `wrappedK` input and no `wrapped-identity.age` sidecar
 * .note = the ephemeral-agent lifecycle + native prompt live in `withKeyrackWrapKeyViaAgent`,
 *         so this reads as one line: derive the seed, derive K's keypair from it. the key
 *         never outlives this call
 */
export const genKeyrackManifestIdentityViaAgent = async (input: {
  owner: string | null;
  keyPath: string;
  pubkeyPath: string;
  askpassCandidates?: string[];
  attribution?: KeyrackUnlockAttribution | null;
}): Promise<{ identity: string; recipient: string }> =>
  withKeyrackWrapKeyViaAgent(
    {
      owner: input.owner,
      keyPath: input.keyPath,
      pubkeyPath: input.pubkeyPath,
      askpassCandidates: input.askpassCandidates,
      attribution: input.attribution,
    },
    async (seed) => asAgeKeyPairFromSeed({ seed }),
  );
