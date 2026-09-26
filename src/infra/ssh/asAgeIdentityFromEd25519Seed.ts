import { sha512 } from '@noble/hashes/sha2.js';
import { bech32 } from '@scure/base';

/**
 * .what = convert ed25519 seed to age identity string
 * .why = age uses x25519 which shares the same curve as ed25519
 *
 * .note = age's x25519 identity is SHA-512(ed25519_seed)[:32] encoded as bech32
 * .note = this matches the go age implementation's ssh key support
 */
export const asAgeIdentityFromEd25519Seed = (input: {
  seed: Uint8Array;
}): string => {
  // x25519 scalar = SHA-512(ed25519_seed)[:32]
  const hash = sha512(input.seed);
  const scalar = hash.slice(0, 32);

  // encode as age identity (bech32 with AGE-SECRET-KEY- prefix)
  const identity = bech32
    .encodeFromBytes('AGE-SECRET-KEY-', scalar)
    .toUpperCase();
  return identity;
};
