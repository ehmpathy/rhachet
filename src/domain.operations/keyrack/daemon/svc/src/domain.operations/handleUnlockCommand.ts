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
 * .note = an sso grant that arrives with a renewal is filed in the renew record, which
 *         replaces any prior entry at its address: a hand unlock cures a lapse or halt
 *         mark and restarts the renew count
 * .note = a grant that arrives with no renewal drops any entry at its exact address,
 *         so an older entry can never renew over the human's fresh grant. renew is
 *         opt-in by the cli; a key with no cap is never renewed
 * .note = `renewals` is optional on the wire, so a payload with none behaves as today
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
): { unlocked: string[] } => {
  const unlockedSlugs: string[] = [];

  for (const grant of input.keys) {
    context.keyStore.set({ grant });
    unlockedSlugs.push(grant.slug);

    // file a renewable grant with its cap; drop any prior entry otherwise
    const renewal = getOneUnlockRenewalForGrant({
      grant,
      renewals: input.renewals ?? [],
    });
    if (renewal) context.renewRecord.set({ grant, capAt: renewal.capAt });
    if (!renewal)
      context.renewRecord.delAt({
        address: asKeyrackKeySlugAtReach({
          slug: grant.slug,
          reach: grant.reach,
        }),
      });
  }

  return { unlocked: unlockedSlugs };
};
