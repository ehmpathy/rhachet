import { getOneAgeIdentityOrNull } from '@src/domain.operations/keyrack/getOneAgeIdentityOrNull';
import { listSshAgentKeys } from '@src/infra/ssh';

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
 * .note = getOneAgeIdentityOrNull skips a per-key parse miss but rethrows a broken crypto load (e6)
 */
export const discoverIdentities = async (input: {
  owner: string | null;
}): Promise<string[]> => {
  const identities: string[] = [];
  const home = process.env.HOME ?? homedir();

  // collect every candidate key path, most-likely-correct first
  const candidatePaths: string[] = [];

  // owner-specific path first (e.g., ~/.ssh/ehmpath) — most likely to be correct
  if (input.owner) candidatePaths.push(join(home, '.ssh', input.owner));

  // ssh-agent keys (path from comment)
  for (const agentKey of listSshAgentKeys())
    if (agentKey.comment) candidatePaths.push(agentKey.comment);

  // standard ssh paths
  candidatePaths.push(
    join(home, '.ssh', 'id_ed25519'),
    join(home, '.ssh', 'id_rsa'),
    join(home, '.ssh', 'id_ecdsa'),
  );

  // convert each present candidate to an identity, dedup, skip per-key parse misses
  for (const keyPath of candidatePaths) {
    if (!existsSync(keyPath)) continue;
    const identity = await getOneAgeIdentityOrNull({ keyPath });
    if (identity && !identities.includes(identity)) identities.push(identity);
  }

  return identities;
};
