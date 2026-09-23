import { writeCloneTraceLine } from './writeCloneTraceLine';

/**
 * .what = the default fault-trace sink — the daemon's own stderr (the operator channel,
 *   never the human's pty mirror), TEE'd to a durable per-day log on disk
 * .why =
 *   - four clone operations (genCloneScreenFeed, genCloneWriteQueue,
 *     getCloneInputStateOrBlind, genCloneSocketServer) inject a `traceToStderr` seam so a
 *     clamp captures the fault sink without a spy. the DEFAULT value was hand-copied at each
 *     site, past the rule-of-three (rule.prefer.decomposable-architecture, wet-over-dry). one
 *     owner ties the default to one construction, so a change to the sink shape (a prefix, a
 *     timestamp, a structured logger) is one edit rather than four synchronized ones with no
 *     compiler tie between them (r004-i019-n1). each site keeps its own injected seam; only
 *     the fallback default has a single home
 *   - 🔴 the TEE is that change, and it closes a real failhide. a detached daemon outlives the
 *     stderr fd it inherited (`stdio: ['ignore', 'pipe', 'inherit']`), so every trace it
 *     writes after the enroll caller exits lands in a pipe with no reader — measured: a grep
 *     for the daemon's own trace lines across every acceptance log in this tree returns ZERO.
 *     a fault channel nobody can read is as good as absent (`rule.forbid.failhide`)
 *
 * .note = stderr is written FIRST and unconditionally, so this is strictly additive — an
 *   attended clone still prints its faults exactly where it did, and no extant clamp moves
 * 🔴 .note = stderr is NOT a private operator channel. it is not the human's pty MIRROR —
 *   that much the line above is right about — but a daemon inherits the enroller's stderr
 *   (`genCloneEnrollDetached`: `stdio: ['ignore', 'pipe', 'inherit']`), so it IS the human's
 *   TERMINAL, one fd, the same place the `😶 clone enrolled` header lands. ⇒ so reach for this
 *   sink for a FAULT, never for a diagnostic that fires on a healthy path: a once-per-lifetime
 *   liveness marker routed here printed above the enroll header on every enroll, which is
 *   `rule.forbid.surprises` on the one line a human reads to learn the enroll worked. a
 *   healthy-path marker belongs in `writeCloneTraceLine` alone, where its reader already looks
 * .note = the day is read PER LINE, never once here: a daemon routinely lives past midnight,
 *   and a path fixed at spawn would append tomorrow's faults to yesterday's file
 * .note = the durable half's own fault is NAMED on stderr rather than swallowed. it is the one
 *   catch here, and it is not a failhide: the line itself already reached stderr above, so
 *   what is reported is the loss of the SECOND copy
 */
export const getCloneTraceSink = (): ((line: string) => void) => {
  const toStderr = process.stderr.write.bind(process.stderr);

  return (line: string): void => {
    toStderr(line);

    try {
      writeCloneTraceLine({
        repoPath: process.cwd(),
        at: new Date(),
        line,
      });
    } catch (error) {
      toStderr(
        `clone trace could not reach its durable log: ${
          error instanceof Error ? error.message : String(error)
        }\n`,
      );
    }
  };
};
