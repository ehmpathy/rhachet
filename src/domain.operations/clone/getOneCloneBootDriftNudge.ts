import type { CloneBootDrift } from './CloneBootDrift';
import { getOneCloneBootDrift } from './getOneCloneBootDrift';
import { getOneCloneBootDriftTold } from './getOneCloneBootDriftTold';
import { isBootDriftOverThreshold } from './isBootDriftOverThreshold';

/**
 * .what = the drift a clone is owed a notice for, or null when it is owed none
 * .why = the onStop hook surfaces one notice per drift, and only past the threshold; the decision
 *        lives here, so the cli arm only latches and prints
 *
 * .note = null for a legacy clone, a current clone, a drift at or under the threshold, or a drift
 *         already surfaced (`boot.drift.told`)
 */
export const getOneCloneBootDriftNudge = (input: {
  actorDir: string;
  cloneDir: string;
  serial: string;
}): Extract<CloneBootDrift, { kind: 'drifted' }> | null => {
  // only a drift can be owed a notice
  const drift = getOneCloneBootDrift(input);
  if (drift.kind !== 'drifted') return null;

  // under the threshold, the drift rides the next compaction with no word
  if (!isBootDriftOverThreshold({ lines: drift.lines })) return null;

  // surfaced once per drift
  const told = getOneCloneBootDriftTold({ cloneDir: input.cloneDir });
  if (told === drift.drift) return null;

  return drift;
};
