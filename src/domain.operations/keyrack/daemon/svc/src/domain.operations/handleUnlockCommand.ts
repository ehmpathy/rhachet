import type { KeyrackDaemonUnlockRenewal } from '@src/domain.objects/keyrack/KeyrackDaemonUnlockRenewal';
import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import type { DaemonKeyStore } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore';
import type { DaemonRenewRecord } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonRenewRecord';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';

import { getOneUnlockRenewalForGrant } from './getOneUnlockRenewalForGrant';

/**
 * .what = handle UNLOCK command to store grants with TTL
 * .why = caches credentials in daemon memory for session-time access
 *
 * .note = a grant that arrives with a renewal is filed in the renew record, which
 *         replaces any prior entry at its address: a hand unlock cures a lapse or halt
 *         mark and restarts the renew count
 * .note = a grant that arrives with no renewal drops any entry at its exact address,
 *         so an older entry can never renew over the human's fresh grant. renew is
 *         opt-in by the cli; a key with no cap is never renewed
 * .note = `renewals` is optional, a deliberate waiver of rule.forbid.undefined-inputs: this
 *         input is the daemon's socket payload, a wire boundary. one daemon serves every
 *         repo on the host, and a cli from an older rhachet sends no `renewals`; a required
 *         field would refuse its unlock. absent files no new renew, and keeps one another
 *         unlock filed at that address (an empty array from a current cli drops it)
 * .note = the reply names the slugs filed for renew, so the cli can tell a daemon that
 *         renews from one too old to know `renewals` — that daemon replies with no
 *         `renewable` field at all
 */
export const handleUnlockCommand = (
  input: {
    keys: KeyrackKeyGrant[];
    renewals?: KeyrackDaemonUnlockRenewal[];
  },
  context: {
    keyStore: DaemonKeyStore;
    renewRecord: DaemonRenewRecord;
  },
): { unlocked: string[]; renewable: string[] } => {
  // .note = deliberate mutation (rule.require.immutable-vars scoped-zone carve-out): the
  //         loop writes the store and the record per grant, a side effect a map cannot
  //         carry, and these two lists record what it did. both are loop-local and leave
  //         only as the reply
  const unlockedSlugs: string[] = [];
  const renewableSlugs: string[] = [];

  for (const grant of input.keys) {
    context.keyStore.set({ grant });
    unlockedSlugs.push(grant.slug);

    // file a renewable grant with its cap; drop any prior entry otherwise
    const renewal = getOneUnlockRenewalForGrant({
      grant,
      renewals: input.renewals ?? [],
    });
    if (renewal) {
      context.renewRecord.set({ grant, capAt: renewal.capAt });
      renewableSlugs.push(grant.slug);
      continue;
    }

    // an older cli sends no `renewals` field at all: a renew another unlock filed is
    //   kept, on the fresh grant and under its prior cap, so a stale cli on a shared
    //   host never silently ends it. only a grant of the same mech keeps it, since the
    //   renew path is the mech's
    const entryPrior =
      input.renewals === undefined
        ? context.renewRecord.get({ slug: grant.slug, reach: grant.reach })
        : null;
    if (entryPrior && entryPrior.grant.source.mech === grant.source.mech) {
      context.renewRecord.set({ grant, capAt: entryPrior.capAt });
      renewableSlugs.push(grant.slug);
      continue;
    }

    // otherwise drop any prior entry, so it never renews over the fresh grant
    context.renewRecord.delAt({
      address: asKeyrackKeySlugAtReach({
        slug: grant.slug,
        reach: grant.reach,
      }),
    });
  }

  return { unlocked: unlockedSlugs, renewable: renewableSlugs };
};
