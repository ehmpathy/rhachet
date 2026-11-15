import type { IsoTimeStamp } from 'iso-time';

import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import { asKeyrackKeyReachField } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachField';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';

import type {
  DaemonRenewEntry,
  DaemonRenewMark,
} from '../domain.objects/daemonRenewRecord';

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
}): Array<{
  slug: string;
  env: string;
  org: string;
  reach?: KeyrackKeyReach;
  expiresAt: IsoTimeStamp | null;
  ttlLeftMs: number;
  renew: { renewedCount: number; mark: DaemonRenewMark | null };
}> => {
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
    .map(({ entry }) => ({
      slug: entry.grant.slug,
      env: entry.grant.env,
      org: entry.grant.org,
      ...asKeyrackKeyReachField({ reach: entry.grant.reach }),
      expiresAt: entry.grant.expiresAt ?? null,
      ttlLeftMs: 0,
      renew: { renewedCount: entry.renewedCount, mark: entry.mark },
    }));
};
