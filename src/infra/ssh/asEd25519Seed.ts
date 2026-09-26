import { BadRequestError } from 'helpful-errors';

import { asOpensshKeyBytes } from './asOpensshKeyBytes';

/**
 * .what = extract ed25519 seed from openssh private key content
 * .why = openssh format embeds the 32-byte seed within a 64-byte secret buffer
 *
 * .note = only call this for unencrypted keys (cipher === 'none')
 * .note = the ed25519 secret buffer is 64 bytes: [seed(32), pubkey(32)]
 * .note = we only need the seed (first 32 bytes)
 */
export const asEd25519Seed = (input: { keyContent: string }): Uint8Array => {
  const keyBytes = asOpensshKeyBytes({ keyContent: input.keyContent });

  // parse openssh key format
  // reference: https://dnaeon.github.io/openssh-private-key-binary-format/
  // deliberate mutation: a sequential cursor into the binary buffer — a
  // walk-the-wire-format parse advances one field at a time; an immutable rewrite
  // would obscure the offset arithmetic this format demands (rule allows let + note)
  let offset = 0;

  // magic header: "openssh-key-v1\0" — a malformed/unsupported key input is a
  // caller-condition (BadRequestError), skippable by identity-pool builders
  const magic = keyBytes.subarray(offset, offset + 15).toString('ascii');
  if (magic !== 'openssh-key-v1\0')
    throw new BadRequestError(`unexpected magic header: ${magic}`, { magic });
  offset += 15;

  // cipher name (string) — skip
  const cipherLen = keyBytes.readUInt32BE(offset);
  offset += 4;
  offset += cipherLen;

  // kdf name (string) — skip
  const kdfLen = keyBytes.readUInt32BE(offset);
  offset += 4;
  offset += kdfLen;

  // kdf options (string, empty for "none") — skip
  const kdfOptsLen = keyBytes.readUInt32BE(offset);
  offset += 4;
  offset += kdfOptsLen;

  // number of keys (uint32)
  const numKeys = keyBytes.readUInt32BE(offset);
  offset += 4;

  if (numKeys !== 1)
    throw new BadRequestError(`expected 1 key, found ${numKeys}`, { numKeys });

  // public key (string, skip it)
  const pubKeyLen = keyBytes.readUInt32BE(offset);
  offset += 4;
  offset += pubKeyLen;

  // encrypted section length
  const encryptedLen = keyBytes.readUInt32BE(offset);
  offset += 4;

  // encrypted section (for unencrypted keys, this is plaintext)
  // format: uint32 checkInt, uint32 checkInt, keytype string, pubkey string, secret string, comment string, pad bytes

  // check integers (must match for integrity)
  const checkInt1 = keyBytes.readUInt32BE(offset);
  offset += 4;
  const checkInt2 = keyBytes.readUInt32BE(offset);
  offset += 4;

  if (checkInt1 !== checkInt2)
    throw new BadRequestError(
      'check integers do not match (key may be corrupted)',
    );

  // key type (string)
  const keyTypeLen = keyBytes.readUInt32BE(offset);
  offset += 4;
  const keyType = keyBytes
    .subarray(offset, offset + keyTypeLen)
    .toString('ascii');
  offset += keyTypeLen;

  // a non-ed25519 key is an EXPECTED caller-condition, not a fault: it simply
  // cannot convert in-process (vision q4 is ed25519-only). typed BadRequestError
  // so callers can allowlist "not convertible in-process" and skip it, while a
  // genuine format/IO fault (a plain Error below) still surfaces loud
  if (keyType !== 'ssh-ed25519')
    throw new BadRequestError(
      `only ed25519 keys supported for age conversion (found: ${keyType})`,
      { keyType },
    );

  // public key (ed25519 is 32 bytes)
  const pubLen = keyBytes.readUInt32BE(offset);
  offset += 4;
  offset += pubLen;

  // secret (ed25519 secret is 64 bytes: seed[32] + pubkey[32])
  const secretLen = keyBytes.readUInt32BE(offset);
  offset += 4;

  if (secretLen !== 64)
    throw new BadRequestError(
      `expected 64-byte ed25519 secret, got ${secretLen}`,
      { secretLen },
    );

  // extract seed (first 32 bytes of the 64-byte secret)
  const seed = keyBytes.subarray(offset, offset + 32);

  return new Uint8Array(seed);
};
