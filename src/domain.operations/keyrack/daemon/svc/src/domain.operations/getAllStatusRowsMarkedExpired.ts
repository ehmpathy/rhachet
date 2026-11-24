import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';

import type { DaemonRenewEntry } from '../domain.objects/daemonRenewRecord';
import { asDaemonStatusRow } from './asDaemonStatusRow';

/**
 * .what = a status row for each marked key whose grant has expired out of the store
 * .why = a lapse or halt stays named until a human acts, past the grant's own life.
 *        the store purges an expired grant, so these rows come from the renew record
 *
 * .note = ttl 0, so the render reads `expired`; a key still live in the store is
 *         listed by the store's own row, never twice
 */
export const getAllStatusRowsMarkedExpired = (input: {
  renewEntries: Array<{ address: string; entry: DaemonRenewEntry }>;
  grantsLive: KeyrackKeyGrant[];
}): Array<ReturnType<typeof asDaemonStatusRow>> => {
  // the addresses the store still holds
  const addressesLive = new Set(
    input.grantsLive.map((grant) =>
      asKeyrackKeySlugAtReach({ slug: grant.slug, reach: grant.reach }),
    ),
  );

  // a marked entry with no live grant, as a status row
  return input.renewEntries
    .filter(
      ({ address, entry }) =>
        entry.mark !== null && !addressesLive.has(address),
    )
    .map(({ entry }) =>
      asDaemonStatusRow({
        grant: entry.grant,
        renewEntry: entry,
        ttlLeftMs: 0,
      }),
    );
};
