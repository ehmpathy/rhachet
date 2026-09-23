import { appendFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

import { getCloneTraceSink } from '../getCloneTraceSink';
import {
  type CloneSayLogCapture,
  computeCloneSayDebugReport,
  computeCloneSayReachFaultReport,
  isCloneSayReachFaultCapture,
} from './computeCloneSayDebugReport';
import { getCloneSayDebugLogPath } from './getCloneSayDebugLogPath';

/**
 * .what = append one failure capture to the day's say debug log; hand back the path a
 *   hint can name, or null when the write itself could not happen
 * .why = a failure verdict discards the classification it was decided from, so the CLI
 *   alone cannot part two rival causes of the same residual (measured 2026-09-16 — F15's
 *   cost). this is the stream that keeps them: it runs on the FAILURE path only, writes to
 *   a gitignored cache, and touches neither stdout nor stderr — so no snapshot moves and
 *   the machine channel is untouched
 *
 * .note = ⚠️ the write NEVER throws. this runs AFTER a verdict is decided, on a dispatch
 *   whose bytes may already have reached the pty — so a full disk, a read-only mount, or a
 *   permission fault must not convert a `buffered` into a crash. that would be the exact
 *   false-failure-on-a-landed-message class this wish exists to kill, reintroduced by a
 *   diagnostic. the fault is NOT hidden: it is traced to the operator's stderr and the
 *   caller gets `null`, so the hint names no path it cannot honor (rule.forbid.failhide)
 *
 * .note = `traceToStderr` is INJECTED so a clamp proves the fault trace fires without a spy
 *   on the process — the same sink shape `genCloneScreenFeed` and `getCloneInputStateOrBlind`
 *   already use
 *
 * .note = it takes EITHER capture shape — a decided verdict, or a reach fault that preempted
 *   one (`sayClone` threw, so no verdict was ever computed). one writer and one path, so the
 *   two renders cannot drift in their shared header, baseline, and grid blocks
 */
export const writeCloneSayDebugLog = (input: {
  repoPath: string;
  capture: CloneSayLogCapture;
  at: Date;
  traceToStderr?: (line: string) => void;
}): string | null => {
  const path = getCloneSayDebugLogPath({
    repoPath: input.repoPath,
    at: input.at,
  });
  try {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(
      path,
      isCloneSayReachFaultCapture(input.capture)
        ? computeCloneSayReachFaultReport({ capture: input.capture })
        : computeCloneSayDebugReport({ capture: input.capture }),
      'utf8',
    );
    return path;
  } catch (error) {
    const traceToStderr = input.traceToStderr ?? getCloneTraceSink();
    const message = error instanceof Error ? error.message : String(error);
    traceToStderr(
      `😶 clone say debug log write failed — the verdict stands, the diagnostic did not land: ${message}\n`,
    );
    return null;
  }
};
