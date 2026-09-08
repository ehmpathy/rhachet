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

  /**
   * .what = the error's FULL metadata payload, verbatim and unredacted
   * .why =
   *   - 🔴 metadata redaction hides the FIX. the curated fields above are a
   *     CONVENIENCE for the consumers that branch on them — they are never a
   *     filter. an error whose fix lives in `path`/`absolutePath`/`from` (or any
   *     field this shape does not name) must still reach the human and the machine
   *   - the earlier shape carried the five curated fields ALONE, so every other
   *     field a thrower attached was discarded at the last layer, after every
   *     upstream author did the work right
   */
  metadata: Record<string, unknown>;
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
 * .what = the deepest a metadata walk descends before it reports a floor rather than recurse
 *
 * ⚠️ this is NOT about cycles — the ancestor guard below already makes the walk terminate on
 *   one. it bounds DEPTH, because a long ACYCLIC chain is the one shape that guard cannot
 *   see, and an overflow inside this render loses the whole report exactly as a throw would.
 *
 * ⚠️ and it is a property of the WALK, never a prediction about payloads. the walk spends
 *   several frames per level where `JSON.stringify` spends one, so there is a band of depths
 *   the serializer handles and an unbounded walk does not. a truncated branch is REPORTED
 *   (`[too deep]`), never dropped silently.
 */
const METADATA_WALK_DEPTH_MAX = 12;

/**
 * .what = one metadata value, projected into a shape `JSON.stringify` can render
 *
 * ⚠️ it WALKS rather than project one level: `JSON.stringify` renders a nested `Error` as
 *   `{}` (`name`/`message`/`stack` are non-enumerable), and a `cause` routinely sits a
 *   level down — `results: [{ cause: err }]`. no `stack` in the projection; a stack is bulk.
 *
 * ⚠️ the cycle guard adds AND deletes — an ANCESTOR check, never a seen-ever set. two peer
 *   fields that reference one object are a DAG, and a grow-only set renders the second
 *   `[circular]` on a graph that serializes fine.
 *
 * ⚠️ a value with its own `toJSON` passes through UNWALKED. a rebuild drops the method, and
 *   a `Date` has no own enumerable property — so a rebuilt one renders `{}`.
 */
const asMetadataValueLegible = (input: {
  value: unknown;
  ancestors: WeakSet<object>;
  depth: number;
}): unknown => {
  const { value, ancestors, depth } = input;

  // the two facts the top-level frame leads with, and the class name is the greppable
  // signal a glyph cannot carry
  if (value instanceof Error)
    return { class: value.constructor.name, message: value.message };

  // `JSON.stringify` refuses a BigInt outright. the `n` suffix is the literal syntax, so
  // the render says what the value WAS rather than quietly narrow it to a number
  if (typeof value === 'bigint') return `${value}n`;

  if (typeof value !== 'object' || value === null) return value;

  // see the docblock: rebuilt here, a `Date` would render `{}`
  if (typeof (value as { toJSON?: unknown }).toJSON === 'function')
    return value;

  if (ancestors.has(value)) return '[circular]';
  if (depth >= METADATA_WALK_DEPTH_MAX) return '[too deep]';

  ancestors.add(value);
  const projected = Array.isArray(value)
    ? value.map((item) =>
        asMetadataValueLegible({ value: item, ancestors, depth: depth + 1 }),
      )
    : Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          asMetadataValueLegible({ value: item, ancestors, depth: depth + 1 }),
        ]),
      );
  ancestors.delete(value);

  return projected;
};

/**
 * .what = a metadata payload `JSON.stringify` can render — every nested `Error` made
 *   legible, every cycle cut, every `BigInt` stated
 *
 * ⚠️ it is TOTAL by construction, never by reliance on its callers. `metadata` is the only
 *   field of `CliErrorJson` that carries an arbitrary value — the rest are a string or a
 *   null — so both the machine channel's `JSON.stringify(shape)` and the human channel's
 *   `JSON.stringify(metadata)` are safe once this is, with no second guard.
 *
 * ⚠️ the residual: a value whose own `toJSON` or getter THROWS still faults, since the walk
 *   must read a property to project it. a per-field catch would trade that narrow fault for
 *   a broad swallow (`rule.forbid.failhide`).
 */
const asMetadataLegible = (
  metadata: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      asMetadataValueLegible({ value, ancestors: new WeakSet(), depth: 0 }),
    ]),
  );

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
    metadata: asMetadataLegible(metadata),
  };
};
