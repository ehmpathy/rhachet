import type { IsoTimeStamp } from 'iso-time';

import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import { asKeyrackKeyReachField } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachField';

import type {
  DaemonRenewEntry,
  DaemonRenewMark,
} from '../domain.objects/daemonRenewRecord';
import { isRenewEntryAtCap } from './isRenewEntryAtCap';

/**
 * .what = one key's row in the STATUS reply, from its grant and its renew entry
 * .why = the reply lists live keys from the store and marked-expired keys from the renew
 *        record; both are one row shape, cast here once, so the two can never drift
 *
 * .note = `renew` is OPTIONAL, never nullable — absent for a key with no renew entry, so
 *         every extant payload and snapshot stays byte-identical
 * .note = `isAtCap` is present only when true, so a key below its cap reads as before
 */
export const asDaemonStatusRow = (input: {
  grant: KeyrackKeyGrant;
  renewEntry: DaemonRenewEntry | null;
  ttlLeftMs: number | null;
}): {
  slug: string;
  env: string;
  org: string;
  reach?: KeyrackKeyReach;
  expiresAt: IsoTimeStamp | null;
  ttlLeftMs: number | null;
  renew?: {
    renewedCount: number;
    mark: DaemonRenewMark | null;
    isAtCap?: true;
  };
} => {
  // the renew facet, where the daemon renews this key
  const renew = input.renewEntry
    ? {
        renewedCount: input.renewEntry.renewedCount,
        mark: input.renewEntry.mark,
        ...(isRenewEntryAtCap({ entry: input.renewEntry })
          ? { isAtCap: true as const }
          : {}),
      }
    : null;

  return {
    slug: input.grant.slug,
    env: input.grant.env,
    org: input.grant.org,
    ...asKeyrackKeyReachField({ reach: input.grant.reach }),
    expiresAt: input.grant.expiresAt ?? null,
    ttlLeftMs: input.ttlLeftMs,
    ...(renew ? { renew } : {}),
  };
};
