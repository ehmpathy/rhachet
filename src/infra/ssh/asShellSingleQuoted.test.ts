import { given, then, when } from 'test-fns';

import { asShellSingleQuoted } from './asShellSingleQuoted';

/**
 * .what = prove the quoter neutralizes shell metacharacters, plus an inner quote
 * .why  = a path baked into the askpass shim must never be reinterpretable as
 *         shell syntax — this is the security boundary of the shim generator
 */
describe('asShellSingleQuoted', () => {
  given('[case1] a plain path', () => {
    when('[t0] quoted', () => {
      then('it is wrapped in single-quotes', () => {
        expect(asShellSingleQuoted('/tmp/dir/shim.sh')).toEqual(
          "'/tmp/dir/shim.sh'",
        );
      });
    });
  });

  given('[case2] a path with a space and metacharacters', () => {
    when('[t0] quoted', () => {
      then('every inner byte stays literal inside the quotes', () => {
        expect(asShellSingleQuoted('/tmp/a b/$(x);rm -rf .')).toEqual(
          "'/tmp/a b/$(x);rm -rf .'",
        );
      });
    });
  });

  given('[case3] a value with an embedded single-quote', () => {
    when('[t0] quoted', () => {
      then('the quote is emitted via the close-escape-reopen idiom', () => {
        expect(asShellSingleQuoted("a'b")).toEqual("'a'\\''b'");
      });
    });
  });
});
