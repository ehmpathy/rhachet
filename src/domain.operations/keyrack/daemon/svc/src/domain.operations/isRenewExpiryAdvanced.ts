import type { IsoTimeStamp } from 'iso-time';

import { isIsoTimeStampAtOrBefore } from './isIsoTimeStampAtOrBefore';

/**
 * .what = whether a renew moved the grant's expiry later
 * .why = the cli hands back its cached role creds until they near their end, so a renew
 *        can return the expiry the grant already holds; that is neither a renew nor a lapse
 *
 * .note = a grant with no expiry has naught to advance past, so any new expiry counts
 */
export const isRenewExpiryAdvanced = (input: {
  expiresAtBefore: IsoTimeStamp | null;
  expiresAtAfter: IsoTimeStamp;
}): boolean =>
  input.expiresAtBefore === null ||
  !isIsoTimeStampAtOrBefore({
    a: input.expiresAtAfter,
    b: input.expiresAtBefore,
  });
