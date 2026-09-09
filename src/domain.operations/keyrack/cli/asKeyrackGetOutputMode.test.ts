import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asKeyrackGetOutputMode } from './asKeyrackGetOutputMode';

describe('asKeyrackGetOutputMode', () => {
  given('[case1] no flag names a render', () => {
    when('[t0] the mode is read', () => {
      then('the floor is vibes — the render a human sees by default', () => {
        expect(asKeyrackGetOutputMode({})).toEqual('vibes');
      });
    });
  });

  given('[case2] exactly one flag names a render', () => {
    when('[t0] each is spelled alone', () => {
      then('each yields its own mode', () => {
        expect(asKeyrackGetOutputMode({ value: true })).toEqual('value');
        expect(asKeyrackGetOutputMode({ json: true })).toEqual('json');
        expect(asKeyrackGetOutputMode({ output: 'json' })).toEqual('json');
        expect(asKeyrackGetOutputMode({ output: 'vibes' })).toEqual('vibes');
      });
    });
  });

  given('[case3] two flags disagree', () => {
    // ⚠️ .why = the whole reason this cast exists. `--value`'s contract is a RAW secret on
    //        stdout, for a `$(rhx keyrack get … --value)` capture. a stray `--json` beside it
    //        must not turn that capture into a json blob — so `--value` outranks every peer
    when('[t0] --value meets --json', () => {
      then('value wins', () => {
        expect(asKeyrackGetOutputMode({ value: true, json: true })).toEqual(
          'value',
        );
      });
    });

    when('[t1] --value meets an explicit --output', () => {
      then('value still wins, even against the explicit flag', () => {
        expect(asKeyrackGetOutputMode({ value: true, output: 'json' })).toEqual(
          'value',
        );
        expect(
          asKeyrackGetOutputMode({ value: true, output: 'vibes' }),
        ).toEqual('value');
      });
    });

    when('[t2] --output meets --json', () => {
      then('the explicit flag outranks the shorthand', () => {
        expect(asKeyrackGetOutputMode({ output: 'vibes', json: true })).toEqual(
          'vibes',
        );
      });
    });
  });

  given('[case5] --output names a mode that does not exist', () => {
    // ⚠️ .why = the clamp on a SILENT WRONG ANSWER, never on a throw for its own sake. the
    //        render switch ends `case 'vibes': default:`, so before this refusal a typo'd
    //        `--output josn` rendered VIBES at exit 0 — a human asked for machine-parseable
    //        json and got prose, and a `| jq` downstream then parsed that prose
    // ⚠️ .why.direction = the two rows below pin OPPOSITE failures, and both are needed. the
    //        first pins that an unknown mode is refused; the second pins that a KNOWN mode is
    //        still accepted. a guard written too wide would pass the first and fail the second
    when('[t0] the mode is unrecognized', () => {
      then('it refuses, and the refusal names the value at fault', () => {
        const error = getError(() =>
          asKeyrackGetOutputMode({ output: 'josn' }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('invalid --output');
        // the VALID SET is named, so a human can pick without a doc
        expect(error.message).toContain('value, json, vibes');
        // ⚠️ and the TYPO ITSELF rides in the metadata — a refusal that names what is
        //    allowed but never what was typed cannot show a human their own mistake
        expect(JSON.stringify(error)).toContain('josn');
      });
    });

    when('[t1] --value is spelled beside the invalid mode', () => {
      then(
        'it STILL refuses — precedence never excuses an invalid value',
        () => {
          // .why = the refusal sits ABOVE the precedence deliberately. were it below, a
          //        `--value` would short-circuit and the bad `--output` would pass unremarked,
          //        so one typo would refuse in one invocation and pass in another, decided by
          //        an unrelated flag
          const error = getError(() =>
            asKeyrackGetOutputMode({ value: true, output: 'josn' }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
        },
      );
    });

    when('[t2] the mode is omitted entirely', () => {
      then('it does NOT refuse — absent is not invalid', () => {
        expect(asKeyrackGetOutputMode({})).toEqual('vibes');
        expect(asKeyrackGetOutputMode({ json: true })).toEqual('json');
      });
    });
  });

  given('[case4] a flag is spelled false rather than omitted', () => {
    // ⚠️ .why = commander hands a boolean flag through as `false` when it carries a
    //        `--no-x` peer, so a false must read as "unspelled", never as a rank claim
    when('[t0] the mode is read', () => {
      then('a false flag defers to the next rung', () => {
        expect(asKeyrackGetOutputMode({ value: false, json: true })).toEqual(
          'json',
        );
        expect(asKeyrackGetOutputMode({ value: false, json: false })).toEqual(
          'vibes',
        );
      });
    });
  });
});
