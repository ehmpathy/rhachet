import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import { daoKeyrackInventory } from '@src/access/daos/daoKeyrackInventory';
import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import { KeyrackHostManifest } from '@src/domain.objects/keyrack';
import { isEphemeralVault } from '@src/domain.operations/keyrack/isEphemeralVault';

import { asKeyrackKeyName } from './asKeyrackKeyName';
import { daemonAccessRelock } from './daemon/sdk';
import type { ContextKeyrack } from './genContextKeyrack';

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
  context: ContextKeyrack,
): Promise<{ effect: 'deleted' | 'not_found' }> => {
  // guard: host manifest required
  if (!context.hostManifest)
    throw new UnexpectedCodePathError(
      'hostManifest required for del; call daoKeyrackHostManifest.get() first',
      { slug: input.slug },
    );
  const hostManifest = context.hostManifest;

  // check if key exists in manifest
  const hostFound = hostManifest.hosts[input.slug];
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
  await daemonAccessRelock({ slugs: [input.slug], owner: context.owner });

  // remove from host manifest
  const hostsUpdated = { ...hostManifest.hosts };
  delete hostsUpdated[input.slug];

  const manifestUpdated = new KeyrackHostManifest({
    ...hostManifest,
    hosts: hostsUpdated,
  });

  // persist updated manifest
  await daoKeyrackHostManifest.set({ upsert: manifestUpdated });

  // for non-sudo keys: also remove from keyrack.yml (if gitroot available)
  if (hostFound.env !== 'sudo' && context.gitroot) {
    const keyName = asKeyrackKeyName({ slug: input.slug });
    await daoKeyrackRepoManifest.del.keyFromEnv({
      gitroot: context.gitroot,
      key: keyName,
      env: hostFound.env,
    });
  }

  // del inventory entry (LAST — prevents "absent but extant" state)
  // .note = ephemeral vaults never create inventory entries
  if (!isEphemeralVault({ vault: hostFound.vault })) {
    await daoKeyrackInventory.del({ slug: input.slug, owner: context.owner });
  }

  return { effect: 'deleted' };
};
