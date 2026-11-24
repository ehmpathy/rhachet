import type { DaemonRenewEntry } from '../domain.objects/daemonRenewRecord';
import { isIsoTimeStampAtOrBefore } from './isIsoTimeStampAtOrBefore';

/**
 * .what = does this entry's grant already expire at its cap?
 * .why = no renew can move such a grant, so the tick never tries one and status must
 *        not claim the renew is on; one named check keeps both reads in step
 */
export const isRenewEntryAtCap = (input: {
  entry: Pick<DaemonRenewEntry, 'capAt' | 'grant'>;
}): boolean =>
  !!input.entry.grant.expiresAt &&
  isIsoTimeStampAtOrBefore({
    a: input.entry.capAt,
    b: input.entry.grant.expiresAt,
  });
