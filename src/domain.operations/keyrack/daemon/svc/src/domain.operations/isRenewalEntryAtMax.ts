import type { DaemonRenewalEntry } from '../domain.objects/daemonRenewalRecord';
import { isIsoTimeStampAtOrBefore } from './isIsoTimeStampAtOrBefore';

/**
 * .what = does this entry's grant already expire at its max?
 * .why = no renew can move such a grant, so the tick never tries one and status must
 *        not claim the renew is on; one named check keeps both reads in step
 */
export const isRenewalEntryAtMax = (input: {
  entry: Pick<DaemonRenewalEntry, 'expiresAtMax' | 'grant'>;
}): boolean =>
  !!input.entry.grant.expiresAt &&
  isIsoTimeStampAtOrBefore({
    a: input.entry.expiresAtMax,
    b: input.entry.grant.expiresAt,
  });
