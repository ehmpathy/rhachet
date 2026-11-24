import { addDuration, type IsoTimeStamp } from 'iso-time';

import type { DaemonRenewEntry } from '../domain.objects/daemonRenewRecord';
import { isIsoTimeStampAtOrBefore } from './isIsoTimeStampAtOrBefore';
import { isRenewEntryAtCap } from './isRenewEntryAtCap';

/**
 * .what = the renew entries owed a renew on this tick
 * .why = an entry is due when it is unmarked, not already mid-renew, and its grant
 *        expires inside the window — or already has, after a sleep
 *
 * .note = a grant that already expires at its cap is never due: no renew can move it, so
 *         a try would only spend an aws call per tick and risk a mark on a key that is
 *         simply at its end. it expires as it would with no renew, and the past-cap drop
 *         clears its entry
 */
export const getAllRenewEntriesDue = (input: {
  entries: Array<{ address: string; entry: DaemonRenewEntry }>;
  now: IsoTimeStamp;
  windowMs: number;
  inflight: ReadonlySet<string>;
}): Array<{ address: string; entry: DaemonRenewEntry }> => {
  const windowEndAt = addDuration(input.now, { milliseconds: input.windowMs });
  return input.entries.filter(
    ({ address, entry }) =>
      entry.mark === null &&
      !input.inflight.has(address) &&
      !!entry.grant.expiresAt &&
      isIsoTimeStampAtOrBefore({ a: entry.grant.expiresAt, b: windowEndAt }) &&
      !isRenewEntryAtCap({ entry }),
  );
};
