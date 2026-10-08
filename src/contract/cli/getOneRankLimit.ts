import { ConstraintError } from 'helpful-errors';

/**
 * .what = the `--top` rank limit, validated
 * .why = it slices the rank column, so an unvalidated value does not fail — it renders a
 *        WRONG report at exit 0. `Number('abc')` is `NaN`, and `rows.slice(0, NaN)` yields an
 *        empty rank block whose whole payload folds into the "… N more" tail
 *
 * 🔴 .note = a report that answers "where does my budget go?" must refuse an input it cannot
 *   honor rather than answer it approximately (`rule.require.failfast`). the peer skill
 *   `calc.tokens.sh` already validates its own `--top` and belays at exit 2; this is the same
 *   contract on the same quantity, so the two agree by construction.
 */
export const getOneRankLimit = (input: {
  raw: string | undefined;
  fallback: number;
}): number => {
  if (input.raw === undefined) return input.fallback;

  // digits only — `Number` alone reads '' as 0, and '0x10', '1e3' as 16 and 1000
  const parsed = Number(input.raw);
  if (!/^\d+$/.test(input.raw) || !Number.isInteger(parsed))
    ConstraintError.throw('--top must be a non-negative integer', {
      top: input.raw,
      expected: 'a non-negative integer, e.g. --top 5',
      found: input.raw,
      hint: 'pass a whole number ≥ 0, or omit --top to rank the default 10',
    });

  return parsed;
};
