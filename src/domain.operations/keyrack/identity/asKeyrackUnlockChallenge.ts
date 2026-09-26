import { KEYRACK_UNLOCK_PROTOCOL } from './keyrackUnlockProtocol';

/**
 * .what = build the domain-separated challenge an ssh-agent signs to derive a
 *         manifest's wrap key
 * .why  = sign-as-KDF safety (vision q8): the wrap key is HKDF over the agent
 *         signature of THIS string, so the string must be stable per manifest
 *         and distinct across manifests — else one owner's signature could
 *         derive another's wrap key
 *
 * .note = the wrap key protects the ONE age identity K that encrypts a host
 *         manifest, and the host manifest is per-owner (`keyrack.host.${owner}.age`,
 *         it spans every org+env), so the challenge is keyed on the OWNER — the
 *         manifest's natural key — not on a finer org/env grain
 * .note = the `keyrack-unlock-v1:` prefix domain-separates keyrack signatures
 *         from any other use of the same ssh key; the `<owner>` suffix makes the
 *         wrap key distinct per owner-manifest
 */
export const asKeyrackUnlockChallenge = (input: {
  owner: string | null;
}): string => `${KEYRACK_UNLOCK_PROTOCOL}:${input.owner ?? 'default'}`;
