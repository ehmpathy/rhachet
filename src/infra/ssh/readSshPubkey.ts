import { readFileSync } from 'node:fs';

/**
 * .what = read an ssh public key from file
 * .why = get pubkey content for use as age recipient
 *
 * .note = accepts path to private key or .pub file
 * .note = returns trimmed pubkey content (ssh-ed25519 AAAA... comment)
 */
export const readSshPubkey = (input: { keyPath: string }): string => {
  const pubPath = input.keyPath.endsWith('.pub')
    ? input.keyPath
    : `${input.keyPath}.pub`;
  return readFileSync(pubPath, 'utf8').trim();
};
