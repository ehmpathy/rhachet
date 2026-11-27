import { asIsoTimeStamp } from 'iso-time';

import type { DaemonKeyStore } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore';
import type { DaemonRenewalRecord } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonRenewalRecord';
import { getOneKeyrackExpiresIn } from '@src/domain.operations/keyrack/getOneKeyrackExpiresIn';

import { asDaemonStatusKey } from './asDaemonStatusKey';
import { getAllStatusKeysRenewalStopped } from './getAllStatusKeysRenewalStopped';

/**
 * .what = handle STATUS command to list unlocked keys with the time each has left
 * .why = shows what credentials are available and when they expire
 *
 * .note = includes homeHash for daemon identity (usecase.5 observability)
 * .note = `expiresIn` is `null` when the grant never dies: the socket is JSON, which
 *         cannot carry `Infinity`. a no-expiry key is a first-class state; `daemonKeyStore`
 *         reads an absent `expiresAt` as always valid
 */
export const handleStatusCommand = (
  _input: Record<string, never>,
  context: {
    keyStore: DaemonKeyStore;
    renewalRecord: DaemonRenewalRecord;
    homeHash: string;
  },
): {
  homeHash: string;
  keys: Array<ReturnType<typeof asDaemonStatusKey>>;
} => {
  const now = asIsoTimeStamp(new Date());

  // .note = entries() yields one grant per (slug, reach), which is exactly right here: the
  //         rack IS the answer to "which reaches can this repo touch". the same call
  //         needs its grants COLLAPSED for relock, which reports per key — see the dedupe
  //         there. one sweep, two consumers, two opposite needs
  const allKeys = context.keyStore.entries();

  // the live keys, each with its renewal state where the daemon renews it
  const keysLive = allKeys.map((grant) =>
    asDaemonStatusKey({
      grant,
      renewalEntry: context.renewalRecord.get({
        slug: grant.slug,
        reach: grant.reach,
      }),
      expiresIn: getOneKeyrackExpiresIn({
        expiresAt: grant.expiresAt ?? null,
        now,
      }),
    }),
  );

  // the keys whose renewal stopped and whose grant has expired, named until a human acts
  const keysRenewalStopped = getAllStatusKeysRenewalStopped({
    renewalEntries: context.renewalRecord.entries(),
    grantsLive: allKeys,
  });

  return {
    homeHash: context.homeHash,
    keys: [...keysLive, ...keysRenewalStopped],
  };
};
