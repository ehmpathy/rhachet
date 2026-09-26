import { BadRequestError } from 'helpful-errors';

import { asOpensshKeyBytes } from './asOpensshKeyBytes';

/**
 * .what = extract the key-type token (e.g. `ssh-ed25519`, `ssh-rsa`) from an
 *         openssh private key's cleartext public section
 * .why = a passphrase-protected key cannot be decrypted to read its seed, but the
 *        openssh-key-v1 format stores the PUBLIC key blob in CLEARTEXT even when the
 *        private half is encrypted — so the key type is knowable without the
 *        passphrase. this lets the ed25519-vs-rsa/ecdsa route decision happen
 *        up-front, on a passphrased key, with no prompt (the twin of asSshKeyCipher,
 *        which reads the cipher field from the same buffer)
 *
 * .note = openssh-key-v1 layout: magic(15) · cipher(len+str) · kdfname(len+str) ·
 *         kdfoptions(len+bytes) · numkeys(u32) · pubkey-blob(len + [typelen+type …]).
 *         the type token leads the first public key blob, always in cleartext
 */
export const asSshKeyTypeFromPrikey = (input: {
  keyContent: string;
}): string => {
  const keyBytes = asOpensshKeyBytes({ keyContent: input.keyContent });
  // deliberate mutation: a sequential cursor into the binary buffer — a
  // walk-the-wire-format parse advances one field at a time; an immutable rewrite
  // would obscure the offset arithmetic this format demands (rule allows let + note)
  let offset = 0;

  // magic header: "openssh-key-v1\0" — validate it (twin of asSshKeyCipher) so a
  // standalone caller of this independently-exported parser gets a clean
  // BadRequestError on a non-openssh buffer, never a silent misparse from a blind
  // offset=15 skip; a genuine I/O fault still surfaces loud via asOpensshKeyBytes
  const magic = keyBytes.subarray(offset, offset + 15).toString('ascii');
  if (magic !== 'openssh-key-v1\0')
    throw new BadRequestError(`unexpected magic header: ${magic}`, { magic });
  offset += 15;

  // skip cipher, kdfname, kdfoptions — each a uint32 length prefix + that many bytes
  offset += 4 + keyBytes.readUInt32BE(offset); // cipher
  offset += 4 + keyBytes.readUInt32BE(offset); // kdfname
  offset += 4 + keyBytes.readUInt32BE(offset); // kdfoptions

  // number of keys (uint32) — then the first public key blob (uint32 length prefix)
  offset += 4; // numkeys
  offset += 4; // pubkey blob length prefix

  // the public key blob leads with the type token: uint32 typelen + type string
  const typeLen = keyBytes.readUInt32BE(offset);
  offset += 4;
  return keyBytes.subarray(offset, offset + typeLen).toString('ascii');
};
