import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';

import type { DaemonRenewalEntry } from '../domain.objects/daemonRenewalRecord';
import { asDaemonStatusKey } from './asDaemonStatusKey';

/**
 * .what = a status key for each lapsed or halted renewal whose grant has expired out of
 *         the store
 * .why = a lapse or halt stays named until a human acts, past the grant's own life.
 *        the store purges an expired grant, so these keys come from the renewal record
 *
 * .note = `expiresIn` is zero, so the render reads `expired`; a key still live in the
 *         store is listed by the store's own key, never twice
 */
export const getAllStatusKeysRenewalStopped = (input: {
  renewalEntries: Array<{ address: string; entry: DaemonRenewalEntry }>;
  grantsLive: KeyrackKeyGrant[];
}): Array<ReturnType<typeof asDaemonStatusKey>> => {
  // the addresses the store still holds
  const addressesLive = new Set(
    input.grantsLive.map((grant) =>
      asKeyrackKeySlugAtReach({ slug: grant.slug, reach: grant.reach }),
    ),
  );

  // a stopped renewal with no live grant, as a status key
  return input.renewalEntries
    .filter(
      ({ address, entry }) =>
        entry.status !== 'on' && !addressesLive.has(address),
    )
    .map(({ entry }) =>
      asDaemonStatusKey({
        grant: entry.grant,
        renewalEntry: entry,
        expiresIn: { seconds: 0 },
      }),
    );
};
