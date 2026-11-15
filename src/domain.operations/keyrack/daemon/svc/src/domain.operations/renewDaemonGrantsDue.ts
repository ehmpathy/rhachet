import type { IsoTimeStamp } from 'iso-time';

import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

import type { DaemonKeyStore } from '../domain.objects/daemonKeyStore';
import type {
  DaemonRenewEntry,
  DaemonRenewRecord,
} from '../domain.objects/daemonRenewRecord';
import { getAllRenewEntriesDue } from './getAllRenewEntriesDue';
import { getAllRenewEntriesPastCap } from './getAllRenewEntriesPastCap';
import { getOneRenewalSettled } from './getOneRenewalSettled';
import type { SsoGrantRenewal } from './getOneSsoGrantRenewal';
import { isIsoTimeStampAtOrBefore } from './isIsoTimeStampAtOrBefore';

/**
 * .what = how many faults in a row mark a renew `halted`
 * .why = one full window of 1m ticks. a blip retries; a stall is named, not left quiet.
 *        counted in ticks, never against the grant's expiry, so a blip at wake after a
 *        sleep (when the grant has already expired) still gets its 10 tries
 */
const FAULTS_UNTIL_HALT = 10;

/**
 * .what = the earlier of two stamps
 * .why = a renew never extends a key past the human's cap
 */
const asIsoTimeStampEarlier = (input: {
  a: IsoTimeStamp;
  b: IsoTimeStamp;
}): IsoTimeStamp => (isIsoTimeStampAtOrBefore(input) ? input.a : input.b);

/**
 * .what = renew one due entry, then write back only if the entry is still held
 * .why = the unit of one tick; isolated so every outcome writes through one
 *        conditional swap, and an unlock or relock mid-renew always wins
 *
 * .note = a code defect (any throw that is not an operational fault) marks the entry
 *         `halted` at once, with its message, then rethrows. a defect does not heal on
 *         retry, so it is named in status now rather than after ten quiet ticks
 */
const renewOneEntry = async (
  input: { address: string; entry: DaemonRenewEntry },
  context: {
    keyStore: DaemonKeyStore;
    renewRecord: DaemonRenewRecord;
    renewTimeoutMs: number;
    getOneRenewal: (input: {
      grant: KeyrackKeyGrant;
    }) => Promise<SsoGrantRenewal>;
  },
): Promise<void> => {
  const { address, entry } = input;

  // ask for a renew, bounded; an operational fault settles, a defect halts and rethrows
  const outcome = await getOneRenewalSettled(
    { grant: entry.grant },
    {
      getOneRenewal: context.getOneRenewal,
      timeoutMs: context.renewTimeoutMs,
    },
  ).catch((defect: unknown) => {
    context.renewRecord.setIfHeld({
      address,
      before: entry,
      after: {
        ...entry,
        mark: {
          kind: 'halted',
          error: `defect: ${defect instanceof Error ? defect.message : String(defect)}`,
        },
      },
    });
    throw defect;
  });

  // a fault counts; ten in a row halt the renew with the last error
  if (outcome.renewal === null) {
    const faultCount = entry.faultCount + 1;
    const isHalt = faultCount >= FAULTS_UNTIL_HALT;
    console.log('[keyrack-daemon] renew fault', {
      address,
      faultCount,
      isHalt,
      error: outcome.fault.message,
    });
    context.renewRecord.setIfHeld({
      address,
      before: entry,
      after: {
        ...entry,
        faultCount,
        mark: isHalt ? { kind: 'halted', error: outcome.fault.message } : null,
      },
    });
    return;
  }

  // a lapse marks the key once; no renew is tried again until a human acts
  if (outcome.renewal.status === 'lapsed') {
    console.log('[keyrack-daemon] renew lapsed', { address });
    context.renewRecord.setIfHeld({
      address,
      before: entry,
      after: { ...entry, mark: { kind: 'lapsed', error: null } },
    });
    return;
  }

  // clamp the new expiry to the human's cap
  const expiresAtNew = asIsoTimeStampEarlier({
    a: outcome.renewal.expiresAt,
    b: entry.capAt,
  });

  // an unchanged expiry is neither a renew nor a lapse: write naught, try next tick
  // .why = the cli hands back its cached role creds until they near their end
  if (
    entry.grant.expiresAt &&
    isIsoTimeStampAtOrBefore({ a: expiresAtNew, b: entry.grant.expiresAt })
  )
    return;

  // write the renewed grant, only if no unlock or relock replaced the entry meanwhile
  const grantNew = new KeyrackKeyGrant({
    ...entry.grant,
    expiresAt: expiresAtNew,
  });
  const isWritten = context.renewRecord.setIfHeld({
    address,
    before: entry,
    after: {
      ...entry,
      grant: grantNew,
      renewedCount: entry.renewedCount + 1,
      faultCount: 0,
    },
  });
  if (!isWritten) return;
  context.keyStore.set({ grant: grantNew });
  console.log('[keyrack-daemon] renewed', {
    address,
    expiresAt: expiresAtNew,
  });
};

/**
 * .what = renew every sso grant that sits inside its renew window
 * .why = one tick of the daemon's renew loop. a grant inside the window, or past its
 *        expiry after a sleep, and under its cap, is renewed from the live portal
 *        session, silently. the consumer never sees the expiry
 *
 * .note = walks the renew record, never the store: the store purges an expired grant
 *         on read, and a grant that expired while the host slept is still renewable
 * .note = a marked entry is skipped: a lapse or halt waits for a human
 * .note = an unmarked entry past its cap is dropped, so the key expires as it does
 *         today; a marked one stays, so its mark stays visible
 * .note = `inflight` holds the addresses mid-renew, so a slow renew never overlaps the
 *         next tick's try at the same key — at most one try per key at a time
 * .note = deliberate mutation: `inflight` is the one set shared across ticks; each try
 *         adds its address and its `finally` removes it, so a throw cannot leave it held
 */
export const renewDaemonGrantsDue = async (
  input: { now: IsoTimeStamp },
  context: {
    keyStore: DaemonKeyStore;
    renewRecord: DaemonRenewRecord;
    inflight: Set<string>;
    windowMs: number;
    renewTimeoutMs: number;
    getOneRenewal: (input: {
      grant: KeyrackKeyGrant;
    }) => Promise<SsoGrantRenewal>;
  },
): Promise<void> => {
  // drop unmarked entries whose cap has passed; the key expires as it would with no renew
  getAllRenewEntriesPastCap({
    entries: context.renewRecord.entries(),
    now: input.now,
  }).forEach(({ address }) => context.renewRecord.delAt({ address }));

  // pick the entries owed a renew on this tick
  const entriesDue = getAllRenewEntriesDue({
    entries: context.renewRecord.entries(),
    now: input.now,
    windowMs: context.windowMs,
    inflight: context.inflight,
  });

  // renew each due entry, at most one try per key
  await Promise.all(
    entriesDue.map(async ({ address, entry }) => {
      context.inflight.add(address);
      try {
        await renewOneEntry({ address, entry }, context);
      } finally {
        context.inflight.delete(address);
      }
    }),
  );
};
