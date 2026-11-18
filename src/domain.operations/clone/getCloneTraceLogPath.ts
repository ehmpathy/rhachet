import { join } from 'path';

import { CLONE_SAY_DEBUG_DIR_REL } from './socket/getCloneSayDebugLogPath';

/**
 * .what = the absolute path of the clone DAEMON's trace log for one calendar day
 * .why =
 *   - 🔴 the daemon's stdio is no place for a trace. a detached daemon's stderr is a pipe no
 *     one reads after handoff (`genCloneEnrollDetached`), and an attended daemon's stderr is
 *     the human's pane, where a trace paints over the brain-cli's screen. so this log is the
 *     daemon's ONLY trace channel (`getOneCloneTraceSinkForDaemon`)
 *   - a wedge is diagnosed after the fact; a report nobody can read is as good as absent
 *     (`rule.forbid.failhide`)
 *   - it sits beside the say debug stream, under the same gitignored `.agent/.cache/`
 *     coordinates, so a reader who already knows where a say's client-side trail lands finds
 *     the daemon's half one filename over
 *
 * .note = ONE file per DAY, the same grain the say debug stream takes — a wedge is rare and a
 *   reader wants the sequence of them side by side, where a per-dispatch file would scatter
 *   that comparison and a single unbounded file would never rotate
 * .note = PURE — the date is an INPUT, never `new Date()` here, so the path is clamped at the
 *   unit grain and a test needs no clock stub
 */
export const getCloneTraceLogPath = (input: {
  repoPath: string;
  at: Date;
}): string => {
  // the LOCAL calendar day, so the filename matches the day a human debugs on rather than a
  // utc day that rolls over mid-night for most of the hosts this runs on
  const year = input.at.getFullYear();
  const month = String(input.at.getMonth() + 1).padStart(2, '0');
  const day = String(input.at.getDate()).padStart(2, '0');
  return join(
    input.repoPath,
    CLONE_SAY_DEBUG_DIR_REL,
    `daemon.${year}-${month}-${day}.log`,
  );
};
