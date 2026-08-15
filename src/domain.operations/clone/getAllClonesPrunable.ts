import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';
import { getHomeHash } from '@src/infra/host/getHomeHash';

import { computeClonePruneDecision } from './computeClonePruneDecision';
import { getCloneReachState } from './getCloneReachState';

/**
 * .what = filter a set of clones down to the ones `rhx clone prune` may reap — the
 *   DEAD ones on THIS host, past the optional `--older-than` age gate
 * .why =
 *   - prune must never touch a clone that could still be reached (LIVE) or is still
 *     at work (DEAF), so it probes each clone's reach-state and keeps only the DEAD
 *     ones — the pure computeClonePruneDecision makes that call, this leaf feeds it
 *     the impurely-probed facts (reach-state + wall-clock age)
 *   - a clone spawned on ANOTHER host is excluded outright: from here its socket/pid
 *     cannot be probed, so it reads DEAD, but it may be alive on its own machine — to
 *     reap it would delete a live clone's record. only same-host clones are prunable
 *     (the cross-host guard the pure classifier deliberately leaves to us)
 *
 * .note = the caller owns enumeration + the `@<actor>` scope and hands the clones
 *   in; this leaf owns the reach probe + the host guard + the decision, so the
 *   invoker reads as narrative and a machine `--output json` and the human plan
 *   filter the SAME set
 */
export const getAllClonesPrunable = async (input: {
  clones: CloneOndisk[];
  olderThanMs: number | null;
}): Promise<CloneOndisk[]> => {
  const homeHash = getHomeHash();
  const nowMs = Date.now();

  // .note = deliberate mutation — a local accumulator built across the async probe
  //   loop, then returned; it never escapes this function
  const prunable: CloneOndisk[] = [];

  for (const clone of input.clones) {
    // a clone on another host is never ours to reap — it may be alive there
    if (clone.hostHash !== homeHash) continue;

    const reachState = await getCloneReachState({ clone });
    // the age is a SPAWN-age (now − spawnedAt), NOT a time-since-death: CloneOndisk carries
    // no diedAt stamp, so `--older-than` filters by how long ago a clone was SPAWNED,
    // a coarse "old clones" floor. a true death-age gate is a deferred refinement
    // (see computeClonePruneDecision's .why)
    const ageMs = nowMs - Date.parse(clone.spawnedAt);
    const decision = computeClonePruneDecision({
      reachState,
      ageMs,
      olderThanMs: input.olderThanMs,
    });
    if (decision === 'prune') prunable.push(clone);
  }

  return prunable;
};
