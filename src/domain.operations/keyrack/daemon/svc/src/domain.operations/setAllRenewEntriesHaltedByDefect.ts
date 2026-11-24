import type { DaemonRenewRecord } from '../domain.objects/daemonRenewRecord';
import { asRenewMarkDefectError } from './asRenewMarkDefectError';
import { getAllRenewEntriesUnmarkedIdle } from './getAllRenewEntriesUnmarkedIdle';
import { setRenewEntryHaltedByDefect } from './setRenewEntryHaltedByDefect';

/**
 * .what = mark every unmarked renew entry `halted` with a tick-level defect
 * .why = a defect thrown by the tick's own orchestration (before any per-key try) has
 *        no key to land on. the timer boundary cannot rethrow it — that would crash the
 *        daemon and evict every caller's keys — so it lands on every entry the tick was
 *        meant to serve, where `keyrack status` names it. a defect is never only logged
 *
 * .note = an entry already marked keeps its mark: a per-key defect or a lapse stays the
 *         cause a human reads
 * .note = an entry mid-renew (from a prior tick) is skipped: its try settles on its own,
 *         and a mark here would drop its success on write
 * .note = a per-key defect never reaches here; it settles on its own entry
 */
export const setAllRenewEntriesHaltedByDefect = (
  input: { defect: unknown },
  context: { renewRecord: DaemonRenewRecord; inflight: ReadonlySet<string> },
): void => {
  const error = asRenewMarkDefectError({ defect: input.defect });
  getAllRenewEntriesUnmarkedIdle({
    entries: context.renewRecord.entries(),
    inflight: context.inflight,
  }).forEach(({ address, entry }) =>
    setRenewEntryHaltedByDefect({ address, entry, error }, context),
  );
};
