import { sha512 } from '@noble/hashes/sha2.js';
import { bech32 } from '@scure/base';
import { BadRequestError } from 'helpful-errors';

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = marker prefix for ssh key path identity
 * .why = distinguishes ssh key paths from age identity strings
 *
 * .note = when identity starts with this, decryptWithIdentity shells out to age CLI
 */
export const SSH_KEY_PATH_MARKER = 'SSH_KEY_PATH:';

/**
 * .what = convert an ed25519 ssh private key to an age identity
 * .why = enables ssh keys to work directly for age encryption/decryption
 *
 * .note = only supports ed25519 keys (not rsa or ecdsa)
 * .note = ed25519 and x25519 share the same curve (Curve25519)
 * .note = conversion: x25519_scalar = SHA-512(ed25519_seed)[:32]
 *
 * .note = for passphrase-protected keys (cipher !== 'none'):
 *         returns SSH_KEY_PATH:$absolutePath marker instead of age identity
 *         downstream code (decryptWithIdentity) shells out to age CLI
 */
export const sshPrikeyToAgeIdentity = (input: { keyPath: string }): string => {
  const keyContent = readFileSync(input.keyPath, 'utf8');
  const cipher = extractSshKeyCipher({ keyContent });

  // for unencrypted keys: in-process conversion (no external deps)
  if (cipher === 'none') {
    const seed = extractEd25519Seed({ keyContent });
    const identity = ed25519SeedToAgeIdentity({ seed });
    return identity;
  }

  // for passphrase-protected keys: check for age CLI, return marker
  if (!isAgeCLIAvailable())
    throw new BadRequestError(
      `🔐 your ssh key is passphrase-protected (cipher: ${cipher}).
keyrack uses the \`age\` cli to decrypt via ssh-agent — no passphrase prompt needed.

install age:
  ├─ brew install age          # macos
  └─ apt install age           # ubuntu/debian

then retry: rhx keyrack init

note: passphrase-less keys (-N "") do not need age installed.`,
      { cipher, keyPath: input.keyPath },
    );

  // return marker for downstream code to use age CLI
  const absolutePath = resolve(input.keyPath);
  return `${SSH_KEY_PATH_MARKER}${absolutePath}`;
};

/**
 * .what = check if the age CLI binary is available on PATH
 * .why = required for passphrase-protected ssh keys
 *
 * .note = explicitly passes process.env to ensure PATH changes are respected
 */
export const isAgeCLIAvailable = (): boolean => {
  try {
    execSync('which age', { stdio: 'pipe', env: process.env });
    return true;
  } catch {
    return false;
  }
};

/**
 * .what = convert ed25519 seed to age identity string
 * .why = age uses x25519 which shares the same curve as ed25519
 *
 * .note = age's x25519 identity is SHA-512(ed25519_seed)[:32] encoded as bech32
 * .note = this matches the go age implementation's ssh key support
 */
export const ed25519SeedToAgeIdentity = (input: {
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

/**
 * .what = extract cipher name from openssh private key content
 * .why = determines if key is passphrase-protected
 *
 * .note = cipher 'none' means unencrypted (no passphrase)
 * .note = cipher 'aes256-ctr' or similar means passphrase-protected
 */
export const extractSshKeyCipher = (input: { keyContent: string }): string => {
  // parse openssh binary format to extract cipher field
  const keyBytes = parseOpensshKeyBytes({ keyContent: input.keyContent });
  let offset = 0;

  // magic header: "openssh-key-v1\0"
  const magic = keyBytes.subarray(offset, offset + 15).toString('ascii');
  if (magic !== 'openssh-key-v1\0')
    throw new Error(`unexpected magic header: ${magic}`);
  offset += 15;

  // cipher name (string)
  const cipherLen = keyBytes.readUInt32BE(offset);
  offset += 4;
  const cipher = keyBytes
    .subarray(offset, offset + cipherLen)
    .toString('ascii');

  return cipher;
};

/**
 * .what = parse openssh private key PEM format to raw bytes
 * .why = reused by cipher extraction and seed extraction
 */
const parseOpensshKeyBytes = (input: { keyContent: string }): Buffer => {
  const lines = input.keyContent.trim().split('\n');
  const headerIdx = lines.findIndex((l) =>
    l.includes('-----BEGIN OPENSSH PRIVATE KEY-----'),
  );
  const footerIdx = lines.findIndex((l) =>
    l.includes('-----END OPENSSH PRIVATE KEY-----'),
  );

  if (headerIdx === -1 || footerIdx === -1)
    throw new Error('not a valid openssh private key format');

  const b64Content = lines.slice(headerIdx + 1, footerIdx).join('');
  return Buffer.from(b64Content, 'base64');
};

/**
 * .what = extract ed25519 seed from openssh private key content
 * .why = openssh format embeds the 32-byte seed within a 64-byte secret buffer
 *
 * .note = only call this for unencrypted keys (cipher === 'none')
 * .note = the ed25519 secret buffer is 64 bytes: [seed(32), pubkey(32)]
 * .note = we only need the seed (first 32 bytes)
 */
export const extractEd25519Seed = (input: {
  keyContent: string;
}): Uint8Array => {
  const keyBytes = parseOpensshKeyBytes({ keyContent: input.keyContent });

  // parse openssh key format
  // reference: https://dnaeon.github.io/openssh-private-key-binary-format/
  let offset = 0;

  // magic header: "openssh-key-v1\0"
  const magic = keyBytes.subarray(offset, offset + 15).toString('ascii');
  if (magic !== 'openssh-key-v1\0')
    throw new Error(`unexpected magic header: ${magic}`);
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

  if (numKeys !== 1) throw new Error(`expected 1 key, found ${numKeys}`);

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
    throw new Error('check integers do not match (key may be corrupted)');

  // key type (string)
  const keyTypeLen = keyBytes.readUInt32BE(offset);
  offset += 4;
  const keyType = keyBytes
    .subarray(offset, offset + keyTypeLen)
    .toString('ascii');
  offset += keyTypeLen;

  if (keyType !== 'ssh-ed25519')
    throw new Error(
      `only ed25519 keys supported for age conversion (found: ${keyType})`,
    );

  // public key (ed25519 is 32 bytes)
  const pubLen = keyBytes.readUInt32BE(offset);
  offset += 4;
  offset += pubLen;

  // secret (ed25519 secret is 64 bytes: seed[32] + pubkey[32])
  const secretLen = keyBytes.readUInt32BE(offset);
  offset += 4;

  if (secretLen !== 64)
    throw new Error(`expected 64-byte ed25519 secret, got ${secretLen}`);

  // extract seed (first 32 bytes of the 64-byte secret)
  const seed = keyBytes.subarray(offset, offset + 32);

  return new Uint8Array(seed);
};
