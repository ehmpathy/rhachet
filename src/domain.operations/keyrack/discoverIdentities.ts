import { listSshAgentKeys, sshPrikeyToAgeIdentity } from '@src/infra/ssh';

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * .what = discover identities from ssh-agent and filesystem
 * .why = builds pool of identities to try for manifest decryption or verification
 *
 * .note = checks owner-specific path first (e.g., ~/.ssh/ehmpath)
 * .note = then checks ssh-agent keys (if path comment is available)
 * .note = then checks standard paths (~/.ssh/id_ed25519, etc)
 */
export const discoverIdentities = (input: {
  owner: string | null;
}): string[] => {
  const identities: string[] = [];
  const home = process.env.HOME ?? homedir();

  // check owner-specific path first (e.g., ~/.ssh/ehmpath) — most likely to be correct
  if (input.owner) {
    const ownerPath = join(home, '.ssh', input.owner);
    if (existsSync(ownerPath)) {
      try {
        const identity = sshPrikeyToAgeIdentity({ keyPath: ownerPath });
        if (!identities.includes(identity)) identities.push(identity);
      } catch {
        // skip keys that fail to convert
      }
    }
  }

  // check ssh-agent keys (path from comment)
  const agentKeys = listSshAgentKeys();
  for (const agentKey of agentKeys) {
    const keyPath = agentKey.comment;
    if (keyPath && existsSync(keyPath)) {
      try {
        const identity = sshPrikeyToAgeIdentity({ keyPath });
        if (!identities.includes(identity)) identities.push(identity);
      } catch {
        // skip keys that fail to convert
      }
    }
  }

  // check standard ssh paths
  const standardPaths = [
    join(home, '.ssh', 'id_ed25519'),
    join(home, '.ssh', 'id_rsa'),
    join(home, '.ssh', 'id_ecdsa'),
  ];
  for (const stdPath of standardPaths) {
    if (existsSync(stdPath)) {
      try {
        const identity = sshPrikeyToAgeIdentity({ keyPath: stdPath });
        if (!identities.includes(identity)) identities.push(identity);
      } catch {
        // skip keys that fail to convert
      }
    }
  }

  return identities;
};
