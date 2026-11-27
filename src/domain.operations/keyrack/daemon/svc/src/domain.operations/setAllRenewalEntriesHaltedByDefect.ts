import type { DaemonRenewalRecord } from '../domain.objects/daemonRenewalRecord';
import { asRenewalDefectError } from './asRenewalDefectError';
import { getAllRenewalEntriesOnIdle } from './getAllRenewalEntriesOnIdle';
import { setRenewalEntryHaltedByDefect } from './setRenewalEntryHaltedByDefect';

/**
 * .what = set every `on` renewal entry `halted` with a tick-level defect
 * .why = a defect thrown by the tick's own orchestration (before any per-key try) has
 *        no key to land on. the timer boundary cannot rethrow it — that would crash the
 *        daemon and evict every caller's keys — so it lands on every entry the tick was
 *        meant to serve, where `keyrack status` names it. a defect is never only logged
 *
 * .note = an entry already lapsed or halted keeps its status: a per-key defect or a lapse
 *         stays the cause a human reads
 * .note = an entry mid-renew (from a prior tick) is skipped: its try settles on its own,
 *         and a halt here would drop its success on write
 * .note = a per-key defect never reaches here; it settles on its own entry
 */
export const setAllRenewalEntriesHaltedByDefect = (
  input: { defect: unknown },
  context: {
    renewalRecord: DaemonRenewalRecord;
    inflight: ReadonlySet<string>;
  },
): void => {
  const error = asRenewalDefectError({ defect: input.defect });
  getAllRenewalEntriesOnIdle({
    entries: context.renewalRecord.entries(),
    inflight: context.inflight,
  }).forEach(({ address, entry }) =>
    setRenewalEntryHaltedByDefect({ address, entry, error }, context),
  );
};
