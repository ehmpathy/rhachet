import type { CloneSayReachFaultCapture } from '@src/domain.operations/clone/socket/computeCloneSayDebugReport';

import { asCliErrorJson } from './asCliErrorJson';

/**
 * .what = project a caught reach fault into the debug capture's `fault` field
 * .why = a reach fault (`wedged`, `exited-mid-dispatch`) is raised BY `sayClone`, upstream of
 *   every verdict, so the say capture that reads a verdict cannot describe it. this reads the
 *   four fields a diagnosis needs off the error itself, plus the elapsed time that parts a
 *   bound from an instant fault — a wedge at exactly the floor is a TIMER, where a fault at
 *   12ms is a dead socket
 *
 * .note = it COMPOSES `asCliErrorJson` rather than re-derive its four fields. that projection
 *   already reads `reachState` and `reachCause` off the error's metadata and undecorates the
 *   message, and it is the same shape a `--output json` consumer sees — so the log and the
 *   machine channel cannot disagree about one fault (rule.always.reuse-pavement-before-improvise)
 *
 * .note = a non-Error throw is wrapped rather than dropped. a thrown string would otherwise
 *   crash the projection inside a catch block, which would convert a diagnosable wedge into
 *   an undiagnosable one — the exact inversion this capture exists to prevent
 */
export const asCloneSayReachFault = (input: {
  error: unknown;
  sinceDispatchMs: number;
}): CloneSayReachFaultCapture['fault'] => {
  const error =
    input.error instanceof Error ? input.error : new Error(String(input.error));
  const projected = asCliErrorJson({ error });
  return {
    class: projected.class,
    message: projected.message,
    reachState: projected.reachState,
    reachCause: projected.reachCause,
    sinceDispatchMs: input.sinceDispatchMs,
  };
};
