import { given, then } from 'test-fns';

import { asExitCodeWithDriftFaults } from './asExitCodeWithDriftFaults';

const TEST_CASES = [
  {
    description: 'a clean sync exits 0',
    given: { exitCodeOfFailures: 0 as const, isDriftFaulted: false },
    expect: 0,
  },
  {
    description: 'a drift fault alone exits 1',
    given: { exitCodeOfFailures: 0 as const, isDriftFaulted: true },
    expect: 1,
  },
  {
    description: 'a constraint failure keeps its 2, drift fault or not',
    given: { exitCodeOfFailures: 2 as const, isDriftFaulted: true },
    expect: 2,
  },
  {
    description: 'a malfunction keeps its 1, drift fault or not',
    given: { exitCodeOfFailures: 1 as const, isDriftFaulted: true },
    expect: 1,
  },
  {
    description: 'a constraint failure with no drift fault keeps its 2',
    given: { exitCodeOfFailures: 2 as const, isDriftFaulted: false },
    expect: 2,
  },
];

describe('asExitCodeWithDriftFaults', () => {
  given('[case1] each pair of failure code and drift fault', () => {
    TEST_CASES.map((testCase) =>
      then(testCase.description, () => {
        expect(asExitCodeWithDriftFaults(testCase.given)).toEqual(
          testCase.expect,
        );
      }),
    );
  });
});
