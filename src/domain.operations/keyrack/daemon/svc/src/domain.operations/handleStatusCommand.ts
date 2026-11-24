import type { DaemonKeyStore } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore';
import type { DaemonRenewRecord } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonRenewRecord';

import { asDaemonStatusRow } from './asDaemonStatusRow';
import { getAllStatusRowsMarkedExpired } from './getAllStatusRowsMarkedExpired';
import { getOneTtlLeftMs } from './getOneTtlLeftMs';

/**
 * .what = handle STATUS command to list unlocked keys with TTL left
 * .why = shows what credentials are available and when they expire
 *
 * .note = includes homeHash for daemon identity (usecase.5 observability)
 * .note = `ttlLeftMs` is `null` when the grant never dies: the socket is JSON, which
 *         cannot carry `Infinity`. a no-expiry key is a first-class state; `daemonKeyStore`
 *         reads an absent `expiresAt` as always valid
 */
export const handleStatusCommand = (
  _input: Record<string, never>,
  context: {
    keyStore: DaemonKeyStore;
    renewRecord: DaemonRenewRecord;
    homeHash: string;
  },
): {
  homeHash: string;
  keys: Array<ReturnType<typeof asDaemonStatusRow>>;
} => {
  const now = Date.now();

  // .note = entries() yields one row per (slug, reach), which is exactly right here: the
  //         rack IS the answer to "which reaches can this repo touch". the same call
  //         needs its rows COLLAPSED for relock, which reports per key — see the dedupe
  //         there. one sweep, two consumers, two opposite needs
  const allKeys = context.keyStore.entries();

  // the live keys, each with its renew state where the daemon renews it
  const keysLive = allKeys.map((grant) =>
    asDaemonStatusRow({
      grant,
      renewEntry: context.renewRecord.get({
        slug: grant.slug,
        reach: grant.reach,
      }),
      ttlLeftMs: getOneTtlLeftMs({
        expiresAt: grant.expiresAt ?? null,
        nowMs: now,
      }),
    }),
  );

  // the marked keys whose grant has expired, still named until a human acts
  const keysMarkedExpired = getAllStatusRowsMarkedExpired({
    renewEntries: context.renewRecord.entries(),
    grantsLive: allKeys,
  });

  return {
    homeHash: context.homeHash,
    keys: [...keysLive, ...keysMarkedExpired],
  };
};
