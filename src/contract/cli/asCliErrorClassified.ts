import { HelpfulError, MalfunctionError } from 'helpful-errors';

import { asThrownValueText } from '@src/utils/asThrownValueText';

/**
 * .what = every thrown value, as a `HelpfulError` the cli can render — a classified one
 *   passes through untouched; anything else is wrapped in a `MalfunctionError` that
 *   carries the original as its cause
 *
 * ⚠️ the wrap class is `MalfunctionError`, never `ConstraintError`: a failure to classify
 *   is a gap in OUR contract at the throw site, so exit 1 is the honest code.
 *
 * ⚠️ a `HelpfulError` passes through UNTOUCHED, `BadRequestError` included. to re-wrap
 *   would bury a `ConstraintError`'s exit 2 inside a `MalfunctionError`'s exit 1 and
 *   invert the one signal the class carries. a parent class exits 1 on a caller fault as
 *   a result — the repair is at its throw site (`rule.forbid.helpful-error-parents`),
 *   never a special case here.
 */
export const asCliErrorClassified = (input: {
  error: unknown;
}): HelpfulError => {
  // ✅ already classified — its class, message, and metadata are its thrower's decisions
  if (input.error instanceof HelpfulError) return input.error;

  const thrown = input.error;

  const hint =
    "this error reached the cli UNCLASSIFIED, so `MalfunctionError` is this layer's verdict rather than its thrower's — read `cause` for the class actually raised and `stack` for where. the repair is at the THROW SITE: raise a `ConstraintError` (exit 2, the caller amends) or a `MalfunctionError` (exit 1, we repair) there, so no layer has to guess";

  // ⚠️ the stack rides its OWN field, untruncated. `asCliErrorJson` projects a nested
  //   `Error` to `{ class, message }` and drops its stack, and an unclassified error has
  //   no hint and no named metadata — so the trace is its whole diagnosis
  if (thrown instanceof Error)
    return new MalfunctionError(thrown.message, {
      hint,
      // `cause` is the settled name for an error chain here, and `asCliErrorJson` renders
      // a nested `Error` legibly rather than as the `{}` a bare stringify would give
      cause: thrown,
      stack: thrown.stack ?? null,
    });

  // ⚠️ a non-`Error` throw is rarer and MORE opaque — it carries no message and no stack,
  //   so the type and a total render of the value are the only facts there are to report
  return new MalfunctionError('a non-error value was thrown', {
    hint,
    thrownType: typeof thrown,
    thrownValue: asThrownValueText(thrown),
  });
};
