import type { IsoDuration, IsoTimeStamp } from 'iso-time';

import type { DaemonStatusKey } from '@src/domain.operations/keyrack/daemon/sdk';
import { getOneKeyrackExpiresIn } from '@src/domain.operations/keyrack/getOneKeyrackExpiresIn';
import { asKeyrackKeyReachField } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachField';

/**
 * .what = one daemon status key, as the key `getKeyrackStatus` returns
 * .why = names the reshape: a reachless key carries no `reach` field, and a key the
 *        daemon does not renew carries no `renewal` field, so absent stays absent
 *
 * .note = a daemon from an older build sends no `expiresIn`; the cast derives it from
 *         `expiresAt`, so every key the cli returns carries one
 */
export const asKeyrackStatusKey = (input: {
  key: DaemonStatusKey;
  now: IsoTimeStamp;
}): DaemonStatusKey & { expiresIn: IsoDuration | null } => ({
  slug: input.key.slug,
  env: input.key.env,
  org: input.key.org,
  ...asKeyrackKeyReachField({ reach: input.key.reach }),
  expiresAt: input.key.expiresAt,
  expiresIn:
    input.key.expiresIn !== undefined
      ? input.key.expiresIn
      : getOneKeyrackExpiresIn({
          expiresAt: input.key.expiresAt,
          now: input.now,
        }),
  ...(input.key.renewal ? { renewal: input.key.renewal } : {}),
});
