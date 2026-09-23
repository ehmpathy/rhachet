import { ConstraintError, MalfunctionError } from 'helpful-errors';

import type { CloneSayRecord } from './asCloneSayRecord';
import type { CloneSayReport } from './computeCloneSayReport';

/**
 * .what = throw a failure report as its classed error — the class sets the exit code, and the
 *   machine-channel record rides the error's `metadata` (which asCliErrorJson projects verbatim)
 * .why = a failure verdict lands on stderr with the class that sets the exit code: `constraint`
 *   = 2 (a caller may amend it — clear the modal, wait, or --force a dirty box), `malfunction`
 *   = 1 (a state to verify). ONE named emit so the orchestrator reads `throw the failure` rather
 *   than a re-derivation of which class each klass maps to (r4-n2)
 * .note = never returns (`never`), so a caller need not handle a fallthrough after it
 *
 * .note = `debugLogPath` names the file the failure's full decision record was appended to
 *   — the baseline, every observe cycle, and the exact grid rows the classifier saw. it
 *   rides the metadata rather than the copy because it is an ADDRESS, not a remedy: the
 *   hint still names the one safe action, and a human or a daemon that wants the evidence
 *   reads the path. `null` when the write could not land (a full disk, a read-only mount),
 *   so the envelope never names a file that is absent (rule.forbid.failhide)
 */
export const throwCloneSayFailure = (input: {
  report: Extract<CloneSayReport, { channel: 'failure' }>;
  record: CloneSayRecord;
  debugLogPath?: string | null;
}): never => {
  const metadata = {
    ...input.record,
    hint: input.report.hint,
    debugLog: input.debugLogPath ?? null,
  };
  if (input.report.klass === 'constraint')
    throw new ConstraintError(input.report.message, metadata);
  throw new MalfunctionError(input.report.message, metadata);
};
