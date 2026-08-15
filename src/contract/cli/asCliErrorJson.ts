import type { CloneReachState } from '@src/domain.operations/clone/computeCloneReachState';
import type { CloneUnreachableCause } from '@src/domain.operations/clone/computeCloneUnreachableHint';

/**
 * .what = the machine-parseable shape of a cli failure
 * .why = a machine consumer (a cron / a comms webhook) branches on FIELDS, never
 *   on stderr prose — so every `--output json` failure carries the same shape
 */
export interface CliErrorJson {
  class: string;
  message: string;
  hint: string | null;
  reachState: CloneReachState | null;
  reachCause: CloneUnreachableCause | null;
}

const isCloneReachState = (value: unknown): value is CloneReachState =>
  value === 'LIVE' || value === 'DEAD' || value === 'DEAF';

const isCloneUnreachableCause = (
  value: unknown,
): value is CloneUnreachableCause =>
  value === 'DEAF' ||
  value === 'DEAD-same-host' ||
  value === 'DEAD-cross-host' ||
  value === 'exited-mid-dispatch' ||
  value === 'wedged';

/**
 * .what = the UNDECORATED message of a helpful-errors error
 * .why = HelpfulError decorates `.message` with an emoji + class prefix + a
 *   serialized-metadata tail (e.g. `✋ ConstraintError: <msg>\n\n{...}`). a machine
 *   channel wants the bare sentence, which the lib stashes on `.original.message`
 *   for exactly this later-access; a plain Error has no `.original`, so fall back
 *   to `.message`
 */
const getUndecoratedMessage = (error: Error): string => {
  if ('original' in error) {
    const original = error.original;
    if (
      typeof original === 'object' &&
      original !== null &&
      'message' in original &&
      typeof original.message === 'string'
    )
      return original.message;
  }
  return error.message;
};

/**
 * .what = project a caught error into the machine error shape
 * .why =
 *   - `class` lets a consumer branch caller-fault (ConstraintError) vs
 *     server-fault (MalfunctionError) the same way an exit code does
 *   - `hint` names the fix, read off the error's own metadata (helpful-errors
 *     carries the second-arg object as `.metadata`)
 *   - `reachState` is READ off the metadata, not re-derived: the reach invoker
 *     (say/get) attaches the getCloneReachState value onto the ConstraintError it
 *     throws, so this transformer reads a field the error already carries — a
 *     non-reach error simply omits it (null)
 *   - `reachCause` is the FINER signal: the 3-value reachState coarsens the five
 *     dispatch faults (DEAF, DEAD-same-host, DEAD-cross-host, exited-mid-dispatch,
 *     wedged) down to LIVE|DEAD|DEAF, so a machine cannot tell a same-host dead
 *     clone (re-enroll here) from a cross-host one (reach from origin), nor see the
 *     two in-flight faults at all (they carry NO reachState, only a reachCause). so
 *     this projects reachCause too — a consumer branches on the exact fix, never a
 *     null `reachState` that reads as a generic error (the wish's cron/comms audience)
 */
export const asCliErrorJson = (input: { error: Error }): CliErrorJson => {
  const { error } = input;
  const metadata =
    'metadata' in error &&
    typeof error.metadata === 'object' &&
    error.metadata !== null
      ? (error.metadata as Record<string, unknown>)
      : {};

  const hint = typeof metadata.hint === 'string' ? metadata.hint : null;
  const reachState = isCloneReachState(metadata.reachState)
    ? metadata.reachState
    : null;
  const reachCause = isCloneUnreachableCause(metadata.reachCause)
    ? metadata.reachCause
    : null;

  return {
    class: error.constructor.name,
    message: getUndecoratedMessage(error),
    hint,
    reachState,
    reachCause,
  };
};
