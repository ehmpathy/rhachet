import { given, then, when } from 'test-fns';

import { getExitCodeFromError } from './getExitCodeFromError';

describe('getExitCodeFromError', () => {
  given('[case1] a plain error without a structured code', () => {
    when('[t0] the exit code is derived', () => {
      then('defaults to 1', () => {
        expect(getExitCodeFromError({ error: new Error('boom') })).toEqual(1);
      });
    });
  });

  given('[case2] an error that holds a structured code.exit', () => {
    when('[t0] the error has code.exit = 2', () => {
      then('returns the structured exit code', () => {
        // simulate a ConstraintError-style structured exit code (code.exit = 2)
        const error = Object.assign(new Error('bad'), { code: { exit: 2 } });
        expect(getExitCodeFromError({ error })).toEqual(2);
      });
    });
  });

  given('[case3] an error with a code that lacks a numeric exit', () => {
    when('[t0] code.exit is absent', () => {
      then('falls back to 1', () => {
        // attach a code object with no numeric `exit` (via Object.assign, no cast)
        const error = Object.assign(new Error('weird'), {
          code: { other: true },
        });
        expect(getExitCodeFromError({ error })).toEqual(1);
      });
    });

    when('[t1] code is not an object', () => {
      then('falls back to 1', () => {
        // attach a non-object code (via Object.assign, no cast)
        const error = Object.assign(new Error('weird'), { code: 'nope' });
        expect(getExitCodeFromError({ error })).toEqual(1);
      });
    });
  });
});
