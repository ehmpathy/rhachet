import type { IsoTimeStamp } from 'iso-time';

import type { DaemonRenewalEntry } from '../domain.objects/daemonRenewalRecord';
import { isIsoTimeStampAtOrBefore } from './isIsoTimeStampAtOrBefore';

/**
 * .what = whether the grant a renew entry holds is still live at `now`
 * .why = an unchanged renew expiry waits a tick while the grant lives; once it has
 *        expired, no later tick sits closer to its end, so the stall counts as a fault
 *
 * .note = a grant with no expiry never reaches a renew (only an ephemeral sso grant is
 *         filed), so it reads as not live, which counts any stall rather than waits
 */
export const isRenewalEntryGrantLive = (input: {
  entry: DaemonRenewalEntry;
  now: IsoTimeStamp;
}): boolean => {
  const expiresAt = input.entry.grant.expiresAt;
  if (!expiresAt) return false;
  return !isIsoTimeStampAtOrBefore({ a: expiresAt, b: input.now });
};
