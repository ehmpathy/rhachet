import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import {
  isKeyrackFillProbeMiss,
  KEYRACK_FILL_PROBE_AGE_MISSES,
} from './isKeyrackFillProbeMiss';

describe('isKeyrackFillProbeMiss', () => {
  /**
   * .what = the class clause, which must answer every fault keyrack itself throws
   * .why = this is the whole point of the rewrite. the prior form matched MESSAGE TEXT, and
   *        one of its five phrases ('vault file absent') had already gone dead — no code
   *        emits it anymore. a class cannot rot that way
   */
  given('[case1] a fault keyrack itself threw', () => {
    when('[t0] it is a ConstraintError — the e6 reach miss', () => {
      then('it is a miss, by class and not by its words', () => {
        expect(
          isKeyrackFillProbeMiss({
            error: new ConstraintError(
              `no key is set for reach 'beav@ehmpathy.com'`,
            ),
          }),
        ).toEqual(true);
      });

      // .note = THE clamp on the rewrite's central claim. the prior form only allowed this
      //         error because its message held the exact phrase `no key is set for reach`.
      //         reword the message and the old form silently ceased to absorb it; the new
      //         form does not read the message at all
      then('it stays a miss even when its words are wholly rewritten', () => {
        expect(
          isKeyrackFillProbeMiss({
            error: new ConstraintError('a completely different sentence'),
          }),
        ).toEqual(true);
      });
    });

    when('[t1] it is a ConstraintError — the manifest miss', () => {
      then('it is a miss', () => {
        expect(
          isKeyrackFillProbeMiss({
            error: new ConstraintError('key not found in manifest: FOO'),
          }),
        ).toEqual(true);
      });
    });
  });

  /**
   * .what = the defect classes, which must NEVER be absorbed
   * .why = a probe that swallowed a defect would print a green fill over a broken vault.
   *        this is the failhide the rule forbids, and it is the reason the catch needs an
   *        allowlist rather than a bare `catch {}`
   */
  given('[case2] a defect', () => {
    when('[t0] it is a MalfunctionError', () => {
      then('it is NOT a miss — it must reach the human', () => {
        expect(
          isKeyrackFillProbeMiss({
            error: new MalfunctionError('the daemon socket is wedged'),
          }),
        ).toEqual(false);
      });
    });

    when('[t1] it is an MalfunctionError', () => {
      // .note = `os.secure vault is locked` is thrown as exactly this class today, and it
      //         was NOT absorbed by the prior message list either. the rewrite preserves
      //         that, which is what makes it a refactor rather than a broader allowlist
      then('it is NOT a miss', () => {
        expect(
          isKeyrackFillProbeMiss({
            error: new MalfunctionError('os.secure vault is locked'),
          }),
        ).toEqual(false);
      });
    });

    when('[t2] it is a bare TypeError', () => {
      then('it is NOT a miss', () => {
        expect(
          isKeyrackFillProbeMiss({
            error: new TypeError('cannot read properties of undefined'),
          }),
        ).toEqual(false);
      });
    });
  });

  /**
   * .what = the ONE message clause, and its bound
   * .why = `age` is foreign. it throws a bare `Error`, and `vaultAdapterOsSecure` hands it
   *        the credential decrypt unwrapped — so there is genuinely no class to read. the
   *        honest shape is to name that exception rather than pretend it away
   */
  given('[case3] a bare Error from the foreign `age` tool', () => {
    for (const phrase of KEYRACK_FILL_PROBE_AGE_MISSES) {
      when(`[t-${phrase}] age refuses with '${phrase}'`, () => {
        then('it is a miss', () => {
          expect(
            isKeyrackFillProbeMiss({
              error: new Error(`age: error: ${phrase} any of the recipients`),
            }),
          ).toEqual(true);
        });
      });
    }

    when('[t-other] a bare Error with words age never says', () => {
      then('it is NOT a miss — the escape hatch is bounded, not open', () => {
        expect(
          isKeyrackFillProbeMiss({
            error: new Error('ENOSPC: no space left on device'),
          }),
        ).toEqual(false);
      });
    });
  });

  /**
   * .what = a thrown value that is not an Error at all
   * .why = `throw 'a string'` is legal js. it carries no class AND no `.message`, so both
   *        clauses must decline rather than crash on a property that is absent
   */
  given('[case4] a thrown value that is not an Error', () => {
    when('[t0] a bare string is thrown', () => {
      then('it is NOT a miss, and the check survives a read of it', () => {
        expect(
          isKeyrackFillProbeMiss({ error: 'no identity matched' }),
        ).toEqual(false);
      });
    });

    when('[t1] null is thrown', () => {
      then('it is NOT a miss', () => {
        expect(isKeyrackFillProbeMiss({ error: null })).toEqual(false);
      });
    });
  });
});
