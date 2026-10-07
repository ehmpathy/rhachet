import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { getOneRankLimit } from './getOneRankLimit';

/**
 * .what = clamps the `--top` rank-limit contract `roles cost` reads
 * .why = an unvalidated value does not fail — it renders a WRONG report at exit 0, which is the
 *        failure class `rule.require.failfast` names.
 *
 * 🔴 .note = `[t0]` is the clamp the unit exists for: `Number('abc')` is `NaN`, and
 *   `rows.slice(0, NaN)` yields an EMPTY rank block, so an unguarded `--top abc` renders a
 *   plausible report rather than an error.
 */
describe('getOneRankLimit', () => {
  given('[case1] a --top rank limit', () => {
    when('[t0] the value is not a number', () => {
      then('it refuses, rather than yield NaN into a slice', () => {
        const error = getError(() =>
          getOneRankLimit({ raw: 'abc', fallback: 10 }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('non-negative integer');
      });
    });

    when('[t1] the value is negative', () => {
      // `slice(0, -5)` silently DROPS the last five rows, so this arm degrades a
      // report rather than empties it — the quieter half of the same defect
      then('it refuses', () => {
        const error = getError(() =>
          getOneRankLimit({ raw: '-5', fallback: 10 }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
      });
    });

    when('[t2] the value is fractional', () => {
      then('it refuses', () => {
        const error = getError(() =>
          getOneRankLimit({ raw: '2.5', fallback: 10 }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
      });
    });

    when('[t3] the value is a valid count', () => {
      then('it is honored', () => {
        expect(getOneRankLimit({ raw: '3', fallback: 10 })).toEqual(3);
      });
    });

    when('[t4] the value is zero', () => {
      // zero is VALID — it ranks no row and folds every one into the tail, which is a
      // coherent ask ("just give me the total"). the guard bounds the sign, not the use
      then('it is honored rather than refused', () => {
        expect(getOneRankLimit({ raw: '0', fallback: 10 })).toEqual(0);
      });
    });

    when('[t5] the flag is absent', () => {
      then('the fallback rules', () => {
        expect(getOneRankLimit({ raw: undefined, fallback: 10 })).toEqual(10);
      });
    });

    when('[t6] the value is a non-decimal form Number would accept', () => {
      // `Number('')` is 0, `Number('0x10')` is 16, `Number('1e3')` is 1000 — each an integer,
      // so only a digits-only check refuses them
      ['', '0x10', '1e3', ' 3'].forEach((raw) =>
        then(`'${raw}' is refused`, () => {
          const error = getError(() => getOneRankLimit({ raw, fallback: 10 }));
          expect(error).toBeInstanceOf(ConstraintError);
        }),
      );
    });
  });
});
