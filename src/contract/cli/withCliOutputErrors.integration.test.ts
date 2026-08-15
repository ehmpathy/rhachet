import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { withCapturedStreams } from '@src/.test/assets/withCapturedStreams';

import { withCliOutputErrors } from './withCliOutputErrors';

/**
 * .what = capture the stderr channel + the process.exitCode for one run of
 *   withCliOutputErrors
 * .why = the HOF's whole job is the error channel + the exit code, both process
 *   globals — so a real run (a stream redirect, read process.exitCode) proves it,
 *   never a mock
 */
const runAndCapture = async (input: {
  outputRaw: string | undefined;
  run: () => Promise<void>;
}): Promise<{ err: string; exitCode: number | undefined }> => {
  // .note = deliberate mutation — reset exitCode for the span of the run, restore
  //   it in the finally; it never escapes runAndCapture
  const exitBefore = process.exitCode;
  process.exitCode = 0;
  try {
    const { err } = await withCapturedStreams({
      run: async () => withCliOutputErrors(input),
    });
    return { err, exitCode: process.exitCode };
  } finally {
    process.exitCode = exitBefore;
  }
};

describe('withCliOutputErrors', () => {
  given('[case1] a run that succeeds', () => {
    when('[t0] wrapped', () => {
      const captured = useBeforeAll(async () =>
        runAndCapture({ outputRaw: 'tree', run: async () => undefined }),
      );

      then('no error is emitted', () => {
        expect(captured.err).toEqual('');
      });

      then('exit code stays 0', () => {
        expect(captured.exitCode).toEqual(0);
      });
    });
  });

  given('[case2] a ConstraintError under --output tree', () => {
    when('[t0] wrapped', () => {
      const captured = useBeforeAll(async () =>
        runAndCapture({
          outputRaw: 'tree',
          run: async () => {
            throw new ConstraintError('bad --as value', {
              hint: 'use --as @:<slug>',
            });
          },
        }),
      );

      then('the human tree names the symptom and the fix', () => {
        expect(captured.err).toContain('✋ bad --as value');
        expect(captured.err).toContain('use --as @:<slug>');
      });

      then('exit code is 2 (caller fault)', () => {
        expect(captured.exitCode).toEqual(2);
      });
    });
  });

  given('[case3] a ConstraintError under --output json', () => {
    when('[t0] wrapped', () => {
      const captured = useBeforeAll(async () =>
        runAndCapture({
          outputRaw: 'json',
          run: async () => {
            throw new ConstraintError('no live clone for this address', {
              hint: 're-enroll to spawn a fresh clone',
              reachState: 'DEAD',
            });
          },
        }),
      );

      then('the error is a machine-parseable json with fields', () => {
        const parsed = JSON.parse(captured.err);
        expect(parsed.class).toEqual('ConstraintError');
        expect(parsed.message).toEqual('no live clone for this address');
        expect(parsed.hint).toEqual('re-enroll to spawn a fresh clone');
        expect(parsed.reachState).toEqual('DEAD');
      });

      then('no human tree glyphs leak into the json channel', () => {
        expect(captured.err).not.toContain('✋');
      });

      then('exit code is 2 (caller fault)', () => {
        expect(captured.exitCode).toEqual(2);
      });
    });
  });

  given('[case4] a MalfunctionError (server fault)', () => {
    when('[t0] wrapped', () => {
      const captured = useBeforeAll(async () =>
        runAndCapture({
          outputRaw: 'tree',
          run: async () => {
            throw new MalfunctionError('the socket server crashed');
          },
        }),
      );

      then('exit code is 1 (server fault)', () => {
        expect(captured.exitCode).toEqual(1);
      });
    });
  });

  given('[case5] a NON-helpful error (a code defect)', () => {
    when('[t0] wrapped', () => {
      then(
        'it is rethrown unchanged (never masked — failhide guard)',
        async () => {
          const raw = new TypeError('cannot read property of undefined');
          const error = await getError(async () =>
            withCliOutputErrors({
              outputRaw: 'tree',
              run: async () => {
                throw raw;
              },
            }),
          );
          expect(error).toBe(raw);
        },
      );
    });
  });
});
