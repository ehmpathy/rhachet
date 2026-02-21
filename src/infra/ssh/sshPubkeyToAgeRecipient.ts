import { ed25519 } from '@noble/curves/ed25519.js';
import { bech32 } from '@scure/base';

/**
 * .what = convert an ssh ed25519 public key to an age recipient
 * .why = enables ssh pubkeys to work with age-encryption npm library
 *
 * .note = age-encryption npm library only supports age1... recipients
 * .note = ed25519 pubkey → x25519 pubkey → bech32 encode → age1...
 * .note = uses ed25519.utils.toMontgomery() for the curve conversion
 */
export const sshPubkeyToAgeRecipient = (input: { pubkey: string }): string => {
  // parse ssh pubkey format: "ssh-ed25519 BASE64_DATA [comment]"
  const parts = input.pubkey.trim().split(/\s+/);
  if (parts.length < 2)
    throw new Error(
      'invalid ssh pubkey format: expected "type base64 [comment]"',
    );

  const [keyType, b64Data] = parts;
  if (keyType !== 'ssh-ed25519')
    throw new Error(`only ed25519 keys supported (found: ${keyType})`);
  if (!b64Data)
    throw new Error('invalid ssh pubkey format: base64 data absent');

  // decode base64 to get wire format
  const wireBytes = Buffer.from(b64Data, 'base64');

  // parse ssh wire format: length-prefixed strings
  // format: uint32 keytype_len, keytype, uint32 pubkey_len, pubkey
  let offset = 0;

  // key type (string)
  const typeLen = wireBytes.readUInt32BE(offset);
  offset += 4;
  const wireKeyType = wireBytes
    .subarray(offset, offset + typeLen)
    .toString('ascii');
  offset += typeLen;

  if (wireKeyType !== 'ssh-ed25519')
    throw new Error(
      `wire format mismatch: expected ssh-ed25519, got ${wireKeyType}`,
    );

  // public key bytes (ed25519 is 32 bytes)
  const pubkeyLen = wireBytes.readUInt32BE(offset);
  offset += 4;

  if (pubkeyLen !== 32)
    throw new Error(`expected 32-byte ed25519 pubkey, got ${pubkeyLen}`);

  const ed25519Pubkey = wireBytes.subarray(offset, offset + 32);

  // convert ed25519 pubkey to x25519 pubkey (edwards → montgomery form)
  const x25519Pubkey = ed25519.utils.toMontgomery(
    new Uint8Array(ed25519Pubkey),
  );

  // encode as age recipient (bech32 with "age" HRP)
  const recipient = bech32.encodeFromBytes('age', x25519Pubkey);

  return recipient;
};
