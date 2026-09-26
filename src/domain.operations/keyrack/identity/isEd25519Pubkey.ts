import { asSshKeyTypeFromPubkey } from '@src/infra/ssh/asSshKeyTypeFromPubkey';

/**
 * .what = decide whether an ssh public key is an ed25519 key
 * .why  = Variant A is ed25519-only for v1 (vision q4): only ed25519 agent
 *         signatures are deterministic-by-design, so only they can back the
 *         sign-as-KDF wrap key. a non-ed25519 key falls to the extant fallback
 *
 * .note = classifies off asSshKeyTypeFromPubkey (the one shared pubkey-type read),
 *         not a second inline parse — so the FIDO `sk-ssh-ed25519@openssh.com`
 *         token reads as its own type, never as plain `ssh-ed25519`
 */
export const isEd25519Pubkey = (input: { pubkey: string }): boolean =>
  asSshKeyTypeFromPubkey({ pubkey: input.pubkey }) === 'ssh-ed25519';
