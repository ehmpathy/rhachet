import type { ConstraintError } from 'helpful-errors';

import { getKeyrackBlockedReport } from '../getKeyrackBlockedReport';

/**
 * .what = the metadata bound `ConstraintError` accepts, read off the class itself
 * .why = `helpful-errors` does not re-export `HelpfulErrorMetadata` from its package root,
 *        and to reach past the root into `dist/` would bind us to its file layout. inferred
 *        from the public class, this tracks the package's own bound with no deep import
 */
type ConstraintErrorMetadata =
  ConstraintError extends ConstraintError<infer TMetadata> ? TMetadata : never;

/**
 * .what = render a caller-fixable keyrack fault as the blocked treestruct, and mark the
 *         process caller-fixable
 * .why = every keyrack command that refuses an input owes a human the SAME two things: the
 *        turtle tree (never a raw `ConstraintError: …` class dump) and exit 2. those two
 *        lines were repeated at each guard, so a new guard could — and did — land with one
 *        and not the other. one operation makes the pair inseparable
 *
 * .note = the caller keeps its own `return`. control flow is the caller's to own, and a
 *         helper that returned early on its behalf would read as a no-op at the call site
 * .note = takes a `ConstraintError` by TYPE, so a `MalfunctionError` cannot be dressed up
 *         as caller-fixable. a guard that catches a thrown error still narrows the class
 *         itself, and rethrows what it does not recognize (rule.forbid.failhide)
 * ⚠️ .note = the bound stays `ConstraintError` DELIBERATELY, and a caller that meets a bare
 *         `ConstraintError` here must fix the THROW SITE rather than widen this bound. this
 *         repo speaks two error words only — `ConstraintError` (caller fixes it, exit 2)
 *         and `MalfunctionError` (server fixes it, exit 1). `ConstraintError` and
 *         `MalfunctionError` are their parents in `helpful-errors`, not words we
 *         throw: to widen to a parent would let a vaguer class in and blur the one
 *         distinction that decides the exit code (`rule.require.failloud`,
 *         `rule.require.exit-code-semantics`)
 * .note = sets `process.exitCode` rather than calls `process.exit`, so the boundary stays
 *         testable and any queued stdout still flushes
 * .note = generic over the error's metadata shape, because `ConstraintError<T>` is invariant
 *         in `T` — a guard that names its own metadata keys (e.g. `{ reach, hint }`) is NOT
 *         assignable to the default `ConstraintError`. the parameter widens to accept any
 *         metadata while the CLASS stays pinned, so the type guard this exists for holds
 */
export const emitKeyrackBlockedReport = <
  TMetadata extends ConstraintErrorMetadata,
>(input: {
  error: ConstraintError<TMetadata>;
  command: string;
}): void => {
  console.error(
    getKeyrackBlockedReport({ error: input.error, command: input.command }),
  );
  // caller-fixable fault: exit 2 (see rule.require.exit-code-semantics)
  process.exitCode = 2;
};
