import { isCommandNotFoundError } from './isCommandNotFoundError';

/**
 * .what = pin the allowlist boundary the `which`-probe failhide fixes rely on:
 *         ONLY a numeric `.status` (the probe ran + exited non-zero) counts as
 *         "command not found"; every other shape is a genuine fault that surfaces
 * .why  = three probes (isSshAgentAvailable, isAgeCliAvailable, the askpass PATH
 *         lookup) swallow ONLY this case; a wrong boundary would re-open the
 *         failhide (rule.forbid.failhide)
 */
const TEST_CASES = [
  {
    description: 'a numeric status (which ran, exited non-zero) → true',
    given: { error: { status: 1 } },
    expect: { output: true },
  },
  {
    description: 'a zero status is still numeric → true',
    given: { error: { status: 0 } },
    expect: { output: true },
  },
  {
    description: 'an ENOENT spawn fault (which absent, status null) → false',
    given: { error: { code: 'ENOENT', status: null } },
    expect: { output: false },
  },
  {
    description: 'an object with no status field → false',
    given: { error: { message: 'permission denied' } },
    expect: { output: false },
  },
  {
    description: 'a plain Error (no numeric status) → false',
    given: { error: new Error('boom') },
    expect: { output: false },
  },
  {
    description: 'null → false',
    given: { error: null },
    expect: { output: false },
  },
  {
    description: 'a string → false',
    given: { error: 'not an object' },
    expect: { output: false },
  },
] as const;

describe('isCommandNotFoundError', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isCommandNotFoundError(thisCase.given.error)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
