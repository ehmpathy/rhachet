/**
 * .what = build a SYNTHETIC openssh-key-v1 PEM with a chosen cipher + type token,
 *         with NO hardware and NO ssh-keygen
 * .why  = a real FIDO/sk- key needs a hardware token to mint, so it cannot be
 *         generated hermetically in ci. but keyrack's key-type route reads ONLY the
 *         cleartext openssh-key-v1 header (the cipher field + the type token in the
 *         first pubkey blob), so a synthetic buffer with cipher=aes256-ctr + a
 *         `sk-ssh-ed25519@…` token drives the EXACT branch a real FIDO key hits —
 *         fully hermetic. the ONE shared home for the blackbox tree's copies of this
 *         builder (rule.require.shared-test-fixtures)
 *
 * .note = a byte-identical twin of src/.test/assets/asSyntheticOpensshKeyPem.ts. the
 *         blackbox tree cannot import @src, so this single cross-tree copy is imposed
 *         by the tree boundary — the src trees share their own copy, not this one
 */
export const asSyntheticOpensshKeyPem = (input: {
  cipher: string;
  keyType: string;
}): string => {
  const asLenPrefixed = (bytes: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(bytes.length);
    return Buffer.concat([len, bytes]);
  };
  const asString = (value: string): Buffer =>
    asLenPrefixed(Buffer.from(value, 'ascii'));

  const magic = Buffer.from('openssh-key-v1\0', 'ascii');
  const kdfname = input.cipher === 'none' ? 'none' : 'bcrypt';
  const numkeys = Buffer.alloc(4);
  numkeys.writeUInt32BE(1);
  const pubkeyBlob = asLenPrefixed(asString(input.keyType));

  const buffer = Buffer.concat([
    magic,
    asString(input.cipher),
    asString(kdfname),
    asString(''), // empty kdfoptions
    numkeys,
    pubkeyBlob,
  ]);
  const wrapped = (buffer.toString('base64').match(/.{1,70}/g) ?? []).join('\n');
  return `-----BEGIN OPENSSH PRIVATE KEY-----\n${wrapped}\n-----END OPENSSH PRIVATE KEY-----\n`;
};
