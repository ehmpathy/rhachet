import type { CloneReachState } from './computeCloneReachState';

/**
 * .what = classify whether a DEAD clone is a suspected SIGKILL-orphan — a live,
 *   still-billed brain whose socket is gone, so it reads DEAD yet stays alive
 * .why =
 *   - a clone stood up through a pty holds a real child brain process. a SIGKILL
 *     (or a crash that skips the catchable-exit cleanup) can take the socket with
 *     it while the child lives on, still billed. that orphan reads DEAD (its socket
 *     refuses a connect) but is NOT gone — a cron that watches for cost hazards must
 *     be able to name it (rule.require.status-feedback)
 *   - the verdict is GUARDED against pid reuse: a bare "is pid N alive?" is unsafe
 *     because the os recycles pids. so the caller re-reads the live pid's START
 *     TIME and the verdict fires only when it MATCHES the recorded one — same host,
 *     pid alive, start-time readable, start-time equal. any gap → not an orphan
 *
 * .note = pure: the caller does the impure probes (host digest, pid liveness, the
 *   /proc start-time read) and passes `livePidStartedAt = null` when the pid is not
 *   alive OR its start time could not be read; this folds both guards into one
 *   nullable, so the verdict below is a single equality
 */
export const computeCloneOrphanVerdict = (input: {
  reachState: CloneReachState;
  recordedHostHash: string;
  currentHostHash: string;
  recordedPidStartedAt: string;
  livePidStartedAt: string | null;
}): { orphan: boolean } => {
  // only a DEAD clone can be an orphan — a LIVE one answers, a DEAF one never had a socket
  if (input.reachState !== 'DEAD') return { orphan: false };

  // a cross-host DEAD clone cannot be probed from here — its pid belongs to another host
  if (input.recordedHostHash !== input.currentHostHash)
    return { orphan: false };

  // the pid is not alive, or its start time could not be read — no orphan to name
  if (input.livePidStartedAt === null) return { orphan: false };

  // the live pid is the SAME process only if its start time matches (guards pid reuse)
  return { orphan: input.livePidStartedAt === input.recordedPidStartedAt };
};
