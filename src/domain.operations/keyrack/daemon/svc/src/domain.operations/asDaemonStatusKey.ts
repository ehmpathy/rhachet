import type { IsoDuration, IsoTimeStamp } from 'iso-time';

import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import { asKeyrackKeyReachField } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachField';

import type { DaemonRenewalEntry } from '../domain.objects/daemonRenewalRecord';
import { isRenewalEntryAtMax } from './isRenewalEntryAtMax';

/**
 * .what = one key in the STATUS reply, from its grant and its renewal entry
 * .why = the reply lists live keys from the store and stopped keys from the renewal
 *        record; both are one key shape, cast here once, so the two can never drift
 *
 * .note = `renewal` is OPTIONAL, never nullable — absent for a key with no renewal entry,
 *         so the json of every other key stays as it was
 * .note = `off` is read here, never held: an `on` entry whose grant already expires at
 *         its max takes no more renewals, so status must not claim one will come
 */
export const asDaemonStatusKey = (input: {
  grant: KeyrackKeyGrant;
  renewalEntry: DaemonRenewalEntry | null;
  expiresIn: IsoDuration | null;
}): {
  slug: string;
  env: string;
  org: string;
  reach?: KeyrackKeyReach;
  expiresAt: IsoTimeStamp | null;
  expiresIn: IsoDuration | null;
  renewal?: {
    status: 'on' | 'off' | 'lapsed' | 'halted';
    count: { renewed: number };
    error: string | null;
  };
} => {
  // the renewal facet, where the daemon renews this key
  const entry = input.renewalEntry;
  const renewal = entry
    ? {
        status:
          entry.status === 'on' && isRenewalEntryAtMax({ entry })
            ? ('off' as const)
            : entry.status,
        count: { renewed: entry.count.renewed },
        error: entry.error,
      }
    : null;

  return {
    slug: input.grant.slug,
    env: input.grant.env,
    org: input.grant.org,
    ...asKeyrackKeyReachField({ reach: input.grant.reach }),
    expiresAt: input.grant.expiresAt ?? null,
    expiresIn: input.expiresIn,
    ...(renewal ? { renewal } : {}),
  };
};
