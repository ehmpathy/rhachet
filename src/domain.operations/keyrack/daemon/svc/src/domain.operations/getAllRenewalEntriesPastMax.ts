import type { IsoTimeStamp } from 'iso-time';

import type { DaemonRenewalEntry } from '../domain.objects/daemonRenewalRecord';
import { isIsoTimeStampAtOrBefore } from './isIsoTimeStampAtOrBefore';

/**
 * .what = the `on` renewal entries whose max expiry has passed
 * .why = past its max, a key expires as it would with no renewal, so its entry is dropped
 *
 * .note = a lapsed or halted entry is never dropped here: it must stay named in status
 *         until a human unlocks or relocks, even the day after (vision case 1, F5)
 */
export const getAllRenewalEntriesPastMax = (input: {
  entries: Array<{ address: string; entry: DaemonRenewalEntry }>;
  now: IsoTimeStamp;
}): Array<{ address: string; entry: DaemonRenewalEntry }> =>
  input.entries.filter(
    ({ entry }) =>
      entry.status === 'on' &&
      isIsoTimeStampAtOrBefore({ a: entry.expiresAtMax, b: input.now }),
  );
