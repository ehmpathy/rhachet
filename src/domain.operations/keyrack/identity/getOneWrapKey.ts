import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { KEYRACK_UNLOCK_PROTOCOL } from './keyrackUnlockProtocol';

/**
 * .what = derive a 32-byte symmetric wrap key from an ssh-agent signature
 * .why  = the sign-as-KDF core (vision q1): an ed25519 agent signature is
 *         deterministic, so HKDF over it yields a stable, secret wrap key
 *         only the key-holder (via the agent) can reproduce
 *
 * .note = pure + deterministic — the same signature always yields the same
 *         wrap key; this is what makes sign-as-KDF work
 * .note = the challenge that produced the signature must be domain-separated
 *         per manifest (see the challenge builder), so one owner's signature
 *         cannot derive another's wrap key
 * .note = `getOne*`, not `compute*`: get-set-gen-verbs treats a deterministic
 *         derivation as a get compute-subtype (like getOneCloneNextIndex), so the
 *         wrap-key derivation is a getOne*. it is pure + NOT cached — each call
 *         re-derives from the given signature, which is itself one-shot per agent
 */
export const getOneWrapKey = (input: { signature: Uint8Array }): Uint8Array => {
  // HKDF-SHA256(ikm = signature) with a fixed info label for domain separation
  // - no salt (the signature is already high-entropy + secret)
  // - 32-byte output = an aes-256 / xchacha key
  const info = new TextEncoder().encode(`${KEYRACK_UNLOCK_PROTOCOL}:wrapKey`);
  return hkdf(sha256, input.signature, undefined, info, 32);
};
