import type { IsoTimeStamp } from 'iso-time';

import type { KeyrackGrantRenewal } from '@src/domain.objects/keyrack/KeyrackGrantMechanismAdapter';
import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

import type { DaemonKeyStore } from '../domain.objects/daemonKeyStore';
import type {
  DaemonRenewalEntry,
  DaemonRenewalRecord,
} from '../domain.objects/daemonRenewalRecord';
import { asRenewalDefectError } from './asRenewalDefectError';
import { getAllRenewalEntriesDue } from './getAllRenewalEntriesDue';
import { getAllRenewalEntriesPastMax } from './getAllRenewalEntriesPastMax';
import { getOneRenewalSettled } from './getOneRenewalSettled';
import { isIsoTimeStampAtOrBefore } from './isIsoTimeStampAtOrBefore';
import { isRenewalEntryGrantLive } from './isRenewalEntryGrantLive';
import { isRenewExpiryAdvanced } from './isRenewExpiryAdvanced';
import { setRenewalEntryHaltedByDefect } from './setRenewalEntryHaltedByDefect';

/**
 * .what = how many faults in a row halt a renewal
 * .why = one full window of 1m ticks. a blip retries; a stall is named, not left quiet.
 *        counted in ticks, never against the grant's expiry, so a blip at wake after a
 *        sleep (when the grant has already expired) still gets its 10 tries
 */
const FAULTS_UNTIL_HALT = 10;

/**
 * .what = the earlier of two stamps
 * .why = a renew never extends a key past its max expiry, the human's bound
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
 * .note = a code defect (any throw that is not an operational fault) rejects this call;
 *         the per-key catch in `renewDaemonGrantsDue` sets THIS entry `halted` at once,
 *         with its class and message. a defect does not heal on retry, so it is named in
 *         status now rather than after ten quiet ticks
 */
const renewOneEntry = async (
  input: { address: string; entry: DaemonRenewalEntry; now: IsoTimeStamp },
  context: {
    keyStore: DaemonKeyStore;
    renewalRecord: DaemonRenewalRecord;
    renewTimeoutMs: number;
    getOneRenewal: (input: {
      grant: KeyrackKeyGrant;
    }) => Promise<KeyrackGrantRenewal>;
  },
): Promise<void> => {
  const { address, entry } = input;

  // ask for a renew, bounded; an operational fault settles, a defect propagates to the
  //   per-key catch in `renewDaemonGrantsDue`, which halts this key alone
  const outcome = await getOneRenewalSettled(
    { grant: entry.grant },
    {
      getOneRenewal: context.getOneRenewal,
      timeoutMs: context.renewTimeoutMs,
    },
  );

  // a fault counts; ten in a row halt the renew with the last error
  // .note = only a renew resets the count; an unchanged expiry on a live grant neither
  //         counts nor resets, so "ten in a row" counts faults with no renew between
  const setFaultCounted = (fault: { message: string }): void => {
    const faulted = entry.count.faulted + 1;
    const isHalt = faulted >= FAULTS_UNTIL_HALT;
    console.log('[keyrack-daemon] renew fault', {
      address,
      faulted,
      isHalt,
      error: fault.message,
    });
    context.renewalRecord.setIfHeld({
      address,
      before: entry,
      after: {
        ...entry,
        count: { ...entry.count, faulted },
        status: isHalt ? 'halted' : 'on',
        error: isHalt ? fault.message : null,
      },
    });
  };
  if (outcome.renewal === null) return setFaultCounted(outcome.fault);

  // a lapse stops the renewal once; no renew is tried again until a human acts
  if (outcome.renewal.status === 'lapsed') {
    console.log('[keyrack-daemon] renew lapsed', { address });
    context.renewalRecord.setIfHeld({
      address,
      before: entry,
      after: { ...entry, status: 'lapsed', error: null },
    });
    return;
  }

  // clamp the new expiry to its max
  const expiresAtNew = asIsoTimeStampEarlier({
    a: outcome.renewal.expiresAt,
    b: entry.expiresAtMax,
  });

  // an expiry that did not advance is no renew. while the held grant lives, the cli may
  // serve its cached creds outside its own refresh margin: write naught, count naught, and
  // try again next tick, when the creds sit closer to their end (vision, edgecases)
  // .note = once the held grant has expired, no later tick sits closer to its end, so the
  //         stall counts as a fault and halts, named, rather than retried quietly (F21)
  // .note = an entry already at its max is never due (getAllRenewalEntriesDue), so a clamp
  //         to the max alone never lands here
  const isAdvanced = isRenewExpiryAdvanced({
    expiresAtBefore: entry.grant.expiresAt ?? null,
    expiresAtAfter: expiresAtNew,
  });
  const isHeldGrantLive = isRenewalEntryGrantLive({ entry, now: input.now });
  if (!isAdvanced && isHeldGrantLive) return;
  if (!isAdvanced)
    return setFaultCounted({
      message: `renew returned no later expiry (${expiresAtNew}, held ${entry.grant.expiresAt ?? 'none'})`,
    });

  // write the renewed grant, only if no unlock or relock replaced the entry meanwhile
  const grantNew = new KeyrackKeyGrant({
    ...entry.grant,
    expiresAt: expiresAtNew,
  });
  const isWritten = context.renewalRecord.setIfHeld({
    address,
    before: entry,
    after: {
      ...entry,
      grant: grantNew,
      count: { renewed: entry.count.renewed + 1, faulted: 0 },
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
 * .what = renew every opted-in grant that sits inside its renew window
 * .why = one tick of the daemon's renew loop. a grant inside the window, or past its
 *        expiry after a sleep, and under its max, is renewed via its mech adapter,
 *        silently. the consumer never sees the expiry
 *
 * .note = an imperative command, the daemon's tick, in the `dispatch*` sense: it reads
 *         and writes the store and the record as one act, so no get/set/gen verb names it
 * .note = a defect settles per key, here: it halts that entry alone, never its peers,
 *         and never rejects the tick (the timer boundary cannot tell one key's defect from
 *         the tick's own)
 * .note = walks the renewal record, never the store: the store purges an expired grant
 *         on read, and a grant that expired while the host slept is still renewable
 * .note = a lapsed or halted entry is skipped: it waits for a human
 * .note = an `on` entry past its max is dropped, so the key expires as it does today; a
 *         lapsed or halted one stays, so its status stays visible
 * .note = `inflight` holds the addresses mid-renew, so a slow renew never overlaps the
 *         next tick's try at the same key — at most one try per key at a time
 * .note = deliberate mutation: `inflight` is the one set shared across ticks; each try
 *         adds its address and its `finally` removes it, so a throw cannot leave it held
 * .note = `windowMs` and `renewTimeoutMs` ride `context`: the scheduler reads them once
 *         and hands them to every tick beside the stores
 */
export const renewDaemonGrantsDue = async (
  input: { now: IsoTimeStamp },
  context: {
    keyStore: DaemonKeyStore;
    renewalRecord: DaemonRenewalRecord;
    inflight: Set<string>;
    windowMs: number;
    renewTimeoutMs: number;
    getOneRenewal: (input: {
      grant: KeyrackKeyGrant;
    }) => Promise<KeyrackGrantRenewal>;
  },
): Promise<void> => {
  // drop `on` entries whose max has passed; the key expires as it would with no renewal
  getAllRenewalEntriesPastMax({
    entries: context.renewalRecord.entries(),
    now: input.now,
  }).forEach(({ address }) => context.renewalRecord.delAt({ address }));

  // pick the entries owed a renew on this tick
  const entriesDue = getAllRenewalEntriesDue({
    entries: context.renewalRecord.entries(),
    now: input.now,
    windowMs: context.windowMs,
    inflight: context.inflight,
  });

  // renew each due entry, at most one try per key
  await Promise.all(
    entriesDue.map(async ({ address, entry }) => {
      context.inflight.add(address);
      try {
        // .why = the whole per-key unit settles on its own entry: a defect in the write
        //        phase (a bad stamp from an adapter, a store throw) halts this key alone,
        //        never its peers at the tick boundary
        await renewOneEntry({ address, entry, now: input.now }, context).catch(
          (defect: unknown) => {
            const error = asRenewalDefectError({ defect });
            setRenewalEntryHaltedByDefect({ address, entry, error }, context);
            console.error('[keyrack-daemon] renew defect', {
              address,
              error,
              defect,
            });
          },
        );
      } finally {
        context.inflight.delete(address);
      }
    }),
  );
};
