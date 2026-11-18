import { BOOT_DRIFT_NUDGE_LINES } from './asCloneBootDriftLines';
import { getCloneBootDrift } from './getCloneBootDrift';
import { getCloneBootDriftTold } from './getCloneBootDriftTold';

/**
 * .what = the drift a clone is owed a nudge for, or null when it is owed none
 * .why = the onStop hook blocks one stop per drift, and only past the threshold; the decision lives
 *        here, so the cli arm only latches and prints
 *
 * .note = null for a legacy clone, a current clone, a drift at or under the threshold, or a drift
 *         the clone was already told of (`boot.drift.told`)
 */
export const getOneCloneBootDriftNudge = (input: {
  actorDir: string;
  cloneDir: string;
}): Extract<
  ReturnType<typeof getCloneBootDrift>,
  { kind: 'drifted' }
> | null => {
  // only a drift can be owed a nudge
  const drift = getCloneBootDrift(input);
  if (drift.kind !== 'drifted') return null;

  // under the threshold, the drift rides the next compaction with no word
  if (drift.lines <= BOOT_DRIFT_NUDGE_LINES) return null;

  // told once per drift
  const told = getCloneBootDriftTold({ cloneDir: input.cloneDir });
  if (told === drift.drift) return null;

  return drift;
};
