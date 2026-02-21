import { BadRequestError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '../../access/daos/daoKeyrackHostManifest';
import { daoKeyrackRepoManifest } from '../../access/daos/daoKeyrackRepoManifest';
import { KeyrackHostManifest } from '../../domain.objects/keyrack';
import { daemonAccessRelock } from './daemon/sdk';
import type { KeyrackHostContext } from './genKeyrackHostContext';

/**
 * .what = remove a credential key from this host
 * .why = enables per-host credential removal
 *
 * .note = removes from vault, host manifest, and keyrack.yml (non-sudo only)
 * .note = idempotent — no-op if key does not exist
 */
export const delKeyrackKeyHost = async (
  input: {
    slug: string;
  },
  context: KeyrackHostContext,
): Promise<{ effect: 'deleted' | 'not_found' }> => {
  // check if key exists in manifest
  const hostFound = context.hostManifest.hosts[input.slug];
  if (!hostFound) return { effect: 'not_found' };

  // remove from vault
  const adapter = context.vaultAdapters[hostFound.vault];
  if (!adapter) {
    throw new BadRequestError(
      `vault adapter not found for vault: ${hostFound.vault}`,
      { slug: input.slug, vault: hostFound.vault },
    );
  }
  await adapter.del({ slug: input.slug, exid: hostFound.exid });

  // prune from daemon (in case key was unlocked in current session)
  await daemonAccessRelock({ slugs: [input.slug] });

  // remove from host manifest
  const hostsUpdated = { ...context.hostManifest.hosts };
  delete hostsUpdated[input.slug];

  const manifestUpdated = new KeyrackHostManifest({
    ...context.hostManifest,
    hosts: hostsUpdated,
  });

  // persist updated manifest
  await daoKeyrackHostManifest.set({ upsert: manifestUpdated });

  // for non-sudo keys: also remove from keyrack.yml (if gitroot available)
  if (hostFound.env !== 'sudo' && context.gitroot) {
    const keyName = input.slug.split('.').slice(2).join('.');
    await daoKeyrackRepoManifest.del.keyFromEnv({
      gitroot: context.gitroot,
      key: keyName,
      env: hostFound.env,
    });
  }

  return { effect: 'deleted' };
};
