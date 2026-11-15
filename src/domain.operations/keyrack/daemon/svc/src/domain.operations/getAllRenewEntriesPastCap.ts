import type { IsoTimeStamp } from 'iso-time';

import type { DaemonRenewEntry } from '../domain.objects/daemonRenewRecord';
import { isIsoTimeStampAtOrBefore } from './isIsoTimeStampAtOrBefore';

/**
 * .what = the unmarked renew entries whose cap has passed
 * .why = past its cap, a key expires as it would with no renew, so its entry is dropped
 *
 * .note = a marked entry is never past-cap here: a lapse or halt must stay named in
 *         status until a human unlocks or relocks, even the day after (vision case 1, F5)
 */
export const getAllRenewEntriesPastCap = (input: {
  entries: Array<{ address: string; entry: DaemonRenewEntry }>;
  now: IsoTimeStamp;
}): Array<{ address: string; entry: DaemonRenewEntry }> =>
  input.entries.filter(
    ({ entry }) =>
      entry.mark === null &&
      isIsoTimeStampAtOrBefore({ a: entry.capAt, b: input.now }),
  );
