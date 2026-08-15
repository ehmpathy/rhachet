import { ConstraintError } from 'helpful-errors';

import type { CloneReachState } from './computeCloneReachState';
import { computeCloneUnreachableHint } from './computeCloneUnreachableHint';

/**
 * .what = build the fail-loud ConstraintError for a clone that cannot be reached —
 *   the message, the hint that names the fix, AND the reachState a machine reads
 * .why =
 *   - `say` and `get` share the exact same "this clone is not reachable" failure:
 *     pick the cause from the reach-state + host match, name the fix, and carry the
 *     reachState in the error metadata so `asCliErrorJson` reads it off a field
 *     (never re-derives it). one owner keeps the two verbs in lockstep
 *   - only a NON-live reach-state reaches here — a LIVE clone is dispatched, never
 *     errored — so the cause is always DEAF or one of the two DEAD kinds
 *
 * .note = pure: the caller probes the reach-state + reads the current host digest
 *   (impure) and hands the facts here; this only maps them to the error
 */
export const asCloneReachError = (input: {
  reachState: Exclude<CloneReachState, 'LIVE'>;
  cloneHostHash: string;
  currentHostHash: string;
}) => {
  const cause =
    input.reachState === 'DEAF'
      ? 'DEAF'
      : input.cloneHostHash === input.currentHostHash
        ? 'DEAD-same-host'
        : 'DEAD-cross-host';

  const { message, hint } = computeCloneUnreachableHint({
    cause,
    hostHash: input.cloneHostHash,
  });

  return new ConstraintError(message, {
    hint,
    reachState: input.reachState,
    reachCause: cause,
  });
};
