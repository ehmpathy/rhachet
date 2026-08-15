import type { CloneReachState } from './computeCloneReachState';

/**
 * .what = decide whether one clone is prunable — `prune` (reap it) or `keep`
 * .why =
 *   - `rhx clone prune` reaps the clones a human no longer needs, but it must NEVER
 *     touch one that could still be reached or is still at work. so the decision
 *     keys on the reach-state: only a DEAD clone (finished/gone) is prune-eligible;
 *     a LIVE clone answers a `say`, and a DEAF clone is still an active process — a
 *     `--no-socket` run mid-task — so both are KEPT (the DEAF→DEAD transition is
 *     what eventually makes a socketless clone prunable, never prune itself)
 *   - the `--older-than` gate holds back a clone whose AGE is below the requested
 *     duration; a null gate prunes every DEAD clone regardless of age. NB the age is
 *     measured from `spawnedAt` (see the caller getAllClonesPrunable), i.e. it is a
 *     SPAWN-age, NOT a time-since-death — so `--older-than 7d` reaps DEAD clones that
 *     were SPAWNED 7+ days ago (a coarse "old clones" floor); it does NOT guarantee
 *     "dead for 7+ days". a true time-since-death gate needs a `diedAt` stamp the
 *     CloneOndisk object does not carry today — a documented limitation, deferred (a lazy
 *     death-observed stamp, or a newest-transcript-mtime proxy, is the future refinement)
 *   - the age + gate arrive as milliseconds, computed by the impure caller
 *     (getAllClonesPrunable) off the clock — so this stays a pure, exhaustively
 *     testable classifier with no time source of its own (rule.require.narrative-flow)
 *
 * .note = the cross-host guard is NOT here: a clone spawned on another host reads
 *   DEAD from this host (its pid/socket cannot be probed), which would read as
 *   prunable — but it may be alive elsewhere, so getAllClonesPrunable excludes a
 *   cross-host clone BEFORE this classifier ever sees it (never a foreign clone
 *   reaped on a stale read)
 */
export type ClonePruneDecision = 'prune' | 'keep';

export const computeClonePruneDecision = (input: {
  reachState: CloneReachState;
  ageMs: number;
  olderThanMs: number | null;
}): ClonePruneDecision => {
  // never reap a clone that can still be reached (LIVE) or is still active (DEAF)
  if (input.reachState !== 'DEAD') return 'keep';

  // a DEAD clone is prune-eligible; a null gate reaps every DEAD clone
  if (input.olderThanMs === null) return 'prune';

  // the gate holds back a clone younger than the requested age
  return input.ageMs >= input.olderThanMs ? 'prune' : 'keep';
};
