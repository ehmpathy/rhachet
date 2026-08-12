import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import { daoKeyrackInventory } from '@src/access/daos/daoKeyrackInventory';
import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack';
import { KeyrackHostManifest } from '@src/domain.objects/keyrack';
import { isEphemeralVault } from '@src/domain.operations/keyrack/isEphemeralVault';
import { asKeyrackKeyReachField } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachField';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';

import { asKeyrackKeyName } from './asKeyrackKeyName';
import { daemonAccessRelock } from './daemon/sdk';
import type { ContextKeyrack } from './genContextKeyrack';

/**
 * .what = remove a credential key from this host
 * .why = enables per-host credential removal
 *
 * .note = removes from vault, host manifest, and keyrack.yml (non-sudo only)
 * .note = idempotent — no-op if key does not exist
 *
 * .note = a `del` names ONE address, exactly as a `set` does — so it must address the
 *         manifest by `(slug, reach)`, never by the bare slug. addressed by slug alone, a
 *         key cut only for a reach is invisible here and reports `not_found` while its
 *         credential sits on disk; and a slug that holds both a reachless key and reach
 *         peers loses only the reachless one, with no signal that peers were left behind.
 *         this is the DESTROY half of the same identity axis `set` already threads
 * .note = this is NOT the `relock` case. `relock` deliberately sweeps every reach of a
 *         slug, because a human who locks a key means the key (q1). a `del` is addressed:
 *         it removes the one key it was pointed at, and leaves its peers alone
 */
export const delKeyrackKeyHost = async (
  input: {
    slug: string;

    /**
     * .what = the reach of the key to remove; absent means the reachless key
     * .why = reach is an identity axis, so a slug alone no longer names one key. optional,
     *        never nullable — an absent reach must address the bare slug byte-identically
     *        to how it did before reach existed (e1)
     */
    reach?: KeyrackKeyReach;
  },
  context: ContextKeyrack,
): Promise<{
  effect: 'deleted' | 'not_found';
  // the remote secret keyrack destroyed, if the adapter owned one (aws.params owned mech) — so
  // the CLI can echo what changed; absent for every adapter that destroys no remote secret
  destroyed?: { exid: string } | null;
}> => {
  // guard: host manifest required
  if (!context.hostManifest)
    throw new MalfunctionError(
      'hostManifest required for del; call daoKeyrackHostManifest.get() first',
      { slug: input.slug },
    );
  const hostManifest = context.hostManifest;

  // address this key by its full identity — the same address `setKeyrackKeyHost` wrote it
  // under, so a del finds exactly the key a set created and no other
  const address = asKeyrackKeySlugAtReach({
    slug: input.slug,
    reach: input.reach,
  });

  // check if key exists in manifest
  const hostFound = hostManifest.hosts[address];
  if (!hostFound) return { effect: 'not_found' };

  // remove from vault
  const adapter = context.vaultAdapters[hostFound.vault];
  if (!adapter) {
    throw new ConstraintError(
      `vault adapter not found for vault: ${hostFound.vault}`,
      { slug: input.slug, vault: hostFound.vault },
    );
  }
  const delResult = await adapter.del(
    {
      slug: input.slug,
      // the reach names WHICH key to destroy — the one cut at that reach. absent it, a vault
      // that files per-reach would destroy the reachless key and strand the addressed one
      ...asKeyrackKeyReachField({ reach: input.reach }),
      exid: hostFound.exid,
      owner: context.owner,
      mech: hostFound.mech,
      meta: hostFound.meta,
    },
    // thread context so aws.params derives the org-scope AWS_PROFILE from context.hostManifest —
    // a scoped-org del authenticates as the org's declared identity, @all as the grove's IMDS role
    context,
  );

  // prune from daemon (in case key was unlocked in current session)
  // .note = scoped to THIS key's reach — absent it, a del at one reach would purge
  //         the live grants of every peer reach of the slug
  await daemonAccessRelock({
    slugs: [input.slug],
    ...asKeyrackKeyReachField({ reach: input.reach }),
    owner: context.owner,
  });

  // remove from host manifest
  const hostsUpdated = { ...hostManifest.hosts };
  delete hostsUpdated[address];

  const manifestUpdated = new KeyrackHostManifest({
    ...hostManifest,
    hosts: hostsUpdated,
  });

  // persist updated manifest
  await daoKeyrackHostManifest.set({ upsert: manifestUpdated });

  // for non-sudo keys: also remove from keyrack.yml (if gitroot available)
  // .note = a REACH key was never written into keyrack.yml — `setKeyrackKeyHost` declines
  //         to, because a repo manifest's `reaches:` line is hand-authored and no keyrack
  //         command mutates it. so a reach del must not strip that line either: the entry
  //         it would remove belongs to the REACHLESS key, which this del was never aimed
  //         at. to remove it would undeclare a key that still exists on the host
  if (!input.reach && hostFound.env !== 'sudo' && context.gitroot) {
    const keyName = asKeyrackKeyName({ slug: input.slug });
    await daoKeyrackRepoManifest.del.keyFromEnv({
      gitroot: context.gitroot,
      key: keyName,
      env: hostFound.env,
    });
  }

  // del inventory entry (LAST — prevents "absent but extant" state)
  // .note = ephemeral vaults never create inventory entries
  // .note = stocked under the full ADDRESS by `setKeyrackKeyHost`, so it must be pulled by
  //         the address too. keyed by the bare slug, a reach del would leave its own
  //         inventory entry behind — and `inferKeyrackKeyStatusWhenNotGranted` reads that
  //         entry to tell "this reach was cut and is locked" from "never cut at all",
  //         so the leftover would report a deleted key as merely locked, forever
  if (!isEphemeralVault({ vault: hostFound.vault })) {
    await daoKeyrackInventory.del({ slug: address, owner: context.owner });
  }

  // an adapter that destroyed a remote secret returns { destroyed }; a void return (every other
  // adapter) carries no disposition to echo, so it falls back to null
  return { effect: 'deleted', destroyed: delResult?.destroyed ?? null };
};
