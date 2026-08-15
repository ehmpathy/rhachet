/**
 * .what = the distinct reasons a clone cannot receive a `say`
 * .why = each cause names a DIFFERENT fix, so the caller must know which one it
 *   hit; one enum keeps the hint selector below exhaustive
 */
export type CloneUnreachableCause =
  | 'DEAF' // never had a socket (--no-socket / non-capable brain / non-POSIX / headless) — can't hear a say, but `get` still observes it
  | 'DEAD-same-host' // had a socket on THIS host; its brain-cli exited, socket gone
  | 'DEAD-cross-host' // spawned on another host; its socket is not reachable here
  | 'exited-mid-dispatch' // the clone exited while the message was in flight
  | 'wedged'; // the socket connected but did not answer in time

/**
 * .what = select the fail-loud { message, hint } for an unreachable clone
 * .why =
 *   - an error must name the FIX, not just the symptom (rule.require.errors-name-
 *     the-fix). the fix differs per cause — re-enroll, reach from the other host,
 *     retry — so this one selector owns them all
 *   - ONE owner means the `rhx clone` dream flips the DEAD hint from "re-enroll"
 *     to "wake" in a single place, and every caller inherits it
 *
 * .note = pure: the caller decides the cause (from reach-state + host match +
 *   dispatch outcome); this only maps a cause to its words
 */
export const computeCloneUnreachableHint = (input: {
  cause: CloneUnreachableCause;
  hostHash: string | null;
}): { message: string; hint: string } => {
  switch (input.cause) {
    case 'DEAF':
      return {
        message:
          'this clone is deaf — it has no dispatch socket, so it cannot hear a `say`',
        hint: 'observe it with `rhx clone get`, or re-enroll interactively (a socket-capable brain, a POSIX host, no `--no-socket`) to make it reachable',
      };
    case 'DEAD-same-host':
      return {
        message: 'no live clone for this address — its socket is gone',
        hint: 're-enroll to spawn a fresh clone',
      };
    case 'DEAD-cross-host':
      return {
        message: `this clone was spawned on another host (${input.hostHash ?? 'unknown'}); its socket is not reachable here`,
        hint: 'reach it from the host that spawned it, or re-enroll here for a fresh clone',
      };
    case 'exited-mid-dispatch':
      return {
        message: 'the clone exited while the message was in flight',
        hint: 're-enroll to spawn a fresh clone, then re-send',
      };
    case 'wedged':
      return {
        message: 'the clone accepted the connection but did not answer in time',
        hint: 'the brain may be busy — retry, or re-enroll if it stays unresponsive',
      };
  }
};
