import type { DaemonStatusRow } from '@src/domain.operations/keyrack/daemon/sdk';
import { asKeyrackKeyReachField } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachField';

/**
 * .what = one daemon status row, as the row `getKeyrackStatus` returns
 * .why = names the reshape: a reachless row carries no `reach` field, and a row the
 *        daemon does not renew carries no `renew` field, so absent stays absent
 */
export const asKeyrackStatusRow = (input: {
  row: DaemonStatusRow;
}): DaemonStatusRow => ({
  slug: input.row.slug,
  env: input.row.env,
  org: input.row.org,
  ...asKeyrackKeyReachField({ reach: input.row.reach }),
  expiresAt: input.row.expiresAt,
  ttlLeftMs: input.row.ttlLeftMs,
  ...(input.row.renew ? { renew: input.row.renew } : {}),
});
