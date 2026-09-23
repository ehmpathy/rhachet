import { join } from 'path';

import { CLONE_SAY_DEBUG_DIR_REL } from './socket/getCloneSayDebugLogPath';

/**
 * .what = the absolute path of the clone DAEMON's trace log for one calendar day
 * .why =
 *   - 🔴 a detached daemon OUTLIVES the stderr fd it inherited. `genCloneEnrollDetached`
 *     spawns it with `stdio: ['ignore', 'pipe', 'inherit']`, so every trace it writes after
 *     the enroll caller exits goes into a pipe with no reader — measured: across every
 *     acceptance log in this tree, a grep for the daemon's own trace lines returns ZERO
 *   - so the operator channel the daemon's faults ride is, in the one scenario that matters
 *     (a wedge diagnosed after the fact), write-only into a closed fd. a report nobody can
 *     read is as good as absent (`rule.forbid.failhide`)
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
