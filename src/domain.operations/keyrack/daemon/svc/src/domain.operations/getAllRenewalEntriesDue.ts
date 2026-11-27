import { addDuration, type IsoTimeStamp } from 'iso-time';

import type { DaemonRenewalEntry } from '../domain.objects/daemonRenewalRecord';
import { isIsoTimeStampAtOrBefore } from './isIsoTimeStampAtOrBefore';
import { isRenewalEntryAtMax } from './isRenewalEntryAtMax';

/**
 * .what = the renewal entries owed a renew on this tick
 * .why = an entry is due when its renewal is `on`, not already mid-renew, and its grant
 *        expires inside the window — or already has, after a sleep
 *
 * .note = a grant that already expires at its max is never due: no renew can move it, so
 *         a try would only spend an aws call per tick and risk a halt on a key that is
 *         simply at its end. it expires as it would with no renewal, and the past-max
 *         drop clears its entry
 */
export const getAllRenewalEntriesDue = (input: {
  entries: Array<{ address: string; entry: DaemonRenewalEntry }>;
  now: IsoTimeStamp;
  windowMs: number;
  inflight: ReadonlySet<string>;
}): Array<{ address: string; entry: DaemonRenewalEntry }> => {
  const windowEndAt = addDuration(input.now, { milliseconds: input.windowMs });
  return input.entries.filter(
    ({ address, entry }) =>
      entry.status === 'on' &&
      !input.inflight.has(address) &&
      !!entry.grant.expiresAt &&
      isIsoTimeStampAtOrBefore({ a: entry.grant.expiresAt, b: windowEndAt }) &&
      !isRenewalEntryAtMax({ entry }),
  );
};
