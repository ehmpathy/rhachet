import { given, then, when } from 'test-fns';

import { asThrownValueText } from './asThrownValueText';

/**
 * .what = clamps the TOTALITY of `asThrownValueText` — every row is a value that a bare
 *   `String()` would throw on, render dishonestly, or be wrongly BELIEVED to throw on
 *
 * 🚨 .why totality is the whole contract = both call sites run inside a catch that exists
 *   to compose a report. a throw from the renderer does not degrade that report, it
 *   destroys it — and the human is left with the render fault where their verdict should
 *   have been (`rule.forbid.failhide`).
 *
 * 🚨 .why the third clause = this file once asserted that `String(Symbol)` throws, and it
 *   does not. a false premise in a clamp is worse than an absent one: it justifies a
 *   branch nobody can retire, because the reason to keep it reads as measured. `[case1]
 *   [t0]` now measures the premise itself, not merely the output it shares with the
 *   fallback.
 */
describe('asThrownValueText', () => {
  given('[case1] a value `String()` throws on — or is thought to', () => {
    when('[t0] a symbol is rendered', () => {
      then('it yields the symbol text', () => {
        expect(asThrownValueText(Symbol('nope'))).toEqual('Symbol(nope)');
      });

      then(
        '`String()` is symbol-SAFE — only implicit conversion throws',
        () => {
          /**
           * 🚨 the clamp on a claim this file once got WRONG. it read *"`String(Symbol)`
           *   raises a TypeError"*, which is false: `String(value)` carries an explicit
           *   carve-out for symbols and returns their descriptive text. what raises
           *   `TypeError: Cannot convert a Symbol value to a string` is IMPLICIT
           *   conversion — a template literal, or `+ ''`.
           *
           *   it went undetected because a symbol renders identically down both paths, so
           *   no output assertion could part them. these two rows can, and that is the
           *   whole reason they exist: the next reader who reaches for a symbol branch as
           *   a `String()` guard finds the premise already measured.
           */
          const thrown = Symbol('nope');
          expect(() => String(thrown)).not.toThrow();
          expect(() => `${thrown as unknown as string}`).toThrow(TypeError);
        },
      );
    });

    when('[t1] an object whose own `toString` throws is rendered', () => {
      then('it yields a tag rather than the object`s own fault', () => {
        // 🚨 the ONE input that genuinely faults, and so the one row the object branch
        //   exists for. `String()` AND `JSON.stringify` both raise here, because both
        //   reach the value's own `toString`; `Object.prototype.toString.call` invokes
        //   no user code at all. the mutation that reddens this: drop the branch.
        const hostile = {
          toString: () => {
            throw new Error('i refuse to render');
          },
        };
        expect(asThrownValueText(hostile)).toEqual('[object Object]');
      });
    });
  });

  given('[case2] a value `String()` would render DISHONESTLY', () => {
    when('[t0] a null is rendered', () => {
      then('it reads `null`, never `[object Null]`', () => {
        /**
         * ⚠️ `typeof null === 'object'`, so a guard that dropped the null check would
         *   send this down the object branch. the report stays honest either way, but
         *   `[object Null]` reads as a value the human might go look for.
         */
        expect(asThrownValueText(null)).toEqual('null');
      });
    });
  });

  given('[case3] a value with an ordinary render', () => {
    when('[t0] the plain scalars are rendered', () => {
      then('each passes through untouched', () => {
        // the guard must not eat the happy path with the sad one
        expect(asThrownValueText('a bare string')).toEqual('a bare string');
        expect(asThrownValueText(42)).toEqual('42');
        expect(asThrownValueText(undefined)).toEqual('undefined');
        expect(asThrownValueText(false)).toEqual('false');
      });
    });

    when('[t1] an object with a SOUND `toString` is rendered', () => {
      then('the tag is used, not the custom render', () => {
        /**
         * ⚠️ the deliberate cost, stated rather than hidden: totality is bought by a
         *   render that ignores a `toString` which would have served. that is the right
         *   trade here — the value is already an unclassified throw, so its
         *   `thrownType` peer field carries the diagnosis, and a render that CAN fault
         *   carries none.
         */
        expect(asThrownValueText({ toString: () => 'i render fine' })).toEqual(
          '[object Object]',
        );
      });
    });
  });
});
