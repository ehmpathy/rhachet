import { given, then, when } from 'test-fns';

import { isCloneTraceHostFault } from './isCloneTraceHostFault';

const TEST_CASES = [
  {
    description:
      'an errno the allowlist never named (a stale nfs handle) is a host fault',
    given: { error: { code: 'ESTALE', syscall: 'open', errno: -116 } },
    expect: { output: true },
  },
  {
    description: 'a full disk is a host fault',
    given: { error: { code: 'ENOSPC', syscall: 'write', errno: -28 } },
    expect: { output: true },
  },
  {
    description: 'an out-of-memory errno from a syscall is a host fault',
    given: { error: { code: 'ENOMEM', syscall: 'mkdir', errno: -12 } },
    expect: { output: true },
  },
  {
    description: "node's own argument check (a NUL byte in a path) is a defect",
    given: {
      error: Object.assign(new TypeError('path must not hold a NUL byte'), {
        code: 'ERR_INVALID_ARG_VALUE',
      }),
    },
    expect: { output: false },
  },
  {
    description: 'a plain TypeError is a defect',
    given: { error: new TypeError('x is undefined') },
    expect: { output: false },
  },
  {
    description: 'a code with no syscall is not a host fault',
    given: { error: { code: 'EACCES' } },
    expect: { output: false },
  },
  {
    description: 'a non-string code is not a host fault',
    given: { error: { code: 42, syscall: 'open' } },
    expect: { output: false },
  },
  {
    description: 'null is not a host fault',
    given: { error: null },
    expect: { output: false },
  },
  {
    description: 'a bare string is not a host fault',
    given: { error: 'ENOSPC' },
    expect: { output: false },
  },
];

describe('isCloneTraceHostFault', () => {
  TEST_CASES.forEach((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the error is classified', () => {
        then(`it reads ${thisCase.expect.output}`, () => {
          expect(
            isCloneTraceHostFault({ error: thisCase.given.error }),
          ).toEqual(thisCase.expect.output);
        });
      });
    }),
  );
});
