import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';
import { getHomeHash } from '@src/infra/host/getHomeHash';

/**
 * .what = is a socketless clone's brain-cli process still alive ON THIS HOST?
 * .why =
 *   - a DEAF clone has no socket, so its liveness cannot be read the way a socket
 *     clone's is (a connect probe). instead we ask the os whether the recorded
 *     `hostPid` still names a live process. this is the fact that flips a
 *     socketless clone DEAF (active) → DEAD (finished) — the wisher's transition
 *     (2026-08-13: "mute clones should be marked dead once they're done")
 *   - a clone spawned on ANOTHER host cannot be probed from here — its pid belongs
 *     to a different machine's process table — so a cross-host clone reads NOT
 *     alive (→ DEAD conservatively), never a foreign pid trusted as ours
 *
 * .note = `process.kill(pid, 0)` sends no signal; it only asks "does this pid
 *   exist and may i signal it?". it throws ESRCH when the pid is gone (dead), and
 *   EPERM when the pid exists but is owned by another user (alive, just not ours) —
 *   so ESRCH is the only "not alive" answer; any other outcome means the pid is
 *   taken, hence alive.
 * .note = PID-REUSE hazard (the refinement, not yet closed): the os recycles pids,
 *   so a finished clone whose pid was reused by an unrelated process would read
 *   alive here. the guard is to compare the live pid's /proc START TIME against the
 *   recorded `hostPidStartedAt` (computeCloneOrphanVerdict already folds this in) —
 *   but `hostPidStartedAt` is a wall-clock `now()` today, not a /proc value, so the
 *   guard cannot fire until genClone records the true /proc start-time (ledger
 *   row 11). this leaf is the ONE seam that refinement slots into.
 */
export const isCloneProcessLive = (input: { clone: CloneOndisk }): boolean => {
  // a clone on another host is not ours to probe — read NOT alive (→ DEAD)
  if (input.clone.hostHash !== getHomeHash()) return false;

  // ask the os whether the recorded pid still names a live process
  try {
    process.kill(input.clone.hostPid, 0);
    return true;
  } catch (error) {
    // ESRCH = no such process (dead); EPERM = exists but not ours (alive)
    return (error as NodeJS.ErrnoException)?.code === 'EPERM';
  }
};
