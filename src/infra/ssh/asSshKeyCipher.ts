import { BadRequestError } from 'helpful-errors';

import { asOpensshKeyBytes } from './asOpensshKeyBytes';

/**
 * .what = extract cipher name from openssh private key content
 * .why = determines if key is passphrase-protected
 *
 * .note = cipher 'none' means unencrypted (no passphrase)
 * .note = cipher 'aes256-ctr' or similar means passphrase-protected
 */
export const asSshKeyCipher = (input: { keyContent: string }): string => {
  // parse openssh binary format to extract cipher field
  const keyBytes = asOpensshKeyBytes({ keyContent: input.keyContent });
  // deliberate mutation: a sequential cursor into the binary buffer — a
  // walk-the-wire-format parse advances one field at a time; an immutable rewrite
  // would obscure the offset arithmetic this format demands (rule allows let + note)
  let offset = 0;

  // magic header: "openssh-key-v1\0"
  // a wrong magic means the input is not an openssh key — a caller-condition
  // (BadRequestError), so pool builders can allowlist "not a convertible key" and
  // skip it, while a genuine I/O fault (permission, EISDIR) still surfaces loud
  const magic = keyBytes.subarray(offset, offset + 15).toString('ascii');
  if (magic !== 'openssh-key-v1\0')
    throw new BadRequestError(`unexpected magic header: ${magic}`, { magic });
  offset += 15;

  // cipher name (string)
  const cipherLen = keyBytes.readUInt32BE(offset);
  offset += 4;
  const cipher = keyBytes
    .subarray(offset, offset + cipherLen)
    .toString('ascii');

  return cipher;
};
