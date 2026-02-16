import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * candidate ssh key filenames in priority order
 *
 * .note = ed25519 first (modern, fast, secure)
 * .note = rsa second (legacy but common)
 * .note = ecdsa third (less common)
 */
const SSH_KEY_CANDIDATES = ['id_ed25519', 'id_rsa', 'id_ecdsa'] as const;

export type SshKeyType = 'ed25519' | 'rsa' | 'ecdsa';

/**
 * .what = find the default ssh key on this machine
 * .why = discover user's ssh key without external dependencies
 *
 * .note = checks ~/.ssh/ for known key filenames
 * .note = requires both private and public key to exist
 * .note = returns null if no key found
 * .note = respects process.env.HOME for testability
 */
export const findDefaultSshKey = (): {
  path: string;
  pubkeyPath: string;
  type: SshKeyType;
} | null => {
  // use process.env.HOME first (for test isolation), fallback to homedir()
  const home = process.env.HOME ?? homedir();
  const sshDir = join(home, '.ssh');

  for (const keyName of SSH_KEY_CANDIDATES) {
    const keyPath = join(sshDir, keyName);
    const pubkeyPath = `${keyPath}.pub`;

    // check both private and public exist
    if (existsSync(keyPath) && existsSync(pubkeyPath)) {
      const type = keyName.replace('id_', '') as SshKeyType;
      return { path: keyPath, pubkeyPath, type };
    }
  }

  return null;
};
