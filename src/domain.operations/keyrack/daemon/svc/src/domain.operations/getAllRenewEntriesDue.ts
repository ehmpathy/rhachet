import { addDuration, type IsoTimeStamp } from 'iso-time';

import type { DaemonRenewEntry } from '../domain.objects/daemonRenewRecord';
import { isIsoTimeStampAtOrBefore } from './isIsoTimeStampAtOrBefore';

/**
 * .what = the renew entries owed a renew on this tick
 * .why = an entry is due when it is unmarked, not already mid-renew, and its grant
 *        expires inside the window — or already has, after a sleep
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
      isIsoTimeStampAtOrBefore({ a: entry.grant.expiresAt, b: windowEndAt }),
  );
};
