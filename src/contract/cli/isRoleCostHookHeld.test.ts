import { given, then, when } from 'test-fns';

import { isRoleCostHookHeld } from './isRoleCostHookHeld';

const TEST_CASES = [
  {
    description: 'no drift of any kind: released',
    given: { over: [], defects: [], drifts: [] },
    expect: { output: false },
  },
  {
    description: 'a boot past its cap: held',
    given: { over: [{}], defects: [], drifts: [] },
    expect: { output: true },
  },
  {
    description: 'an owned content defect: held',
    given: { over: [], defects: [{}], drifts: [] },
    expect: { output: true },
  },
  {
    description: 'a mod pin past its role: held',
    given: { over: [], defects: [], drifts: [{}] },
    expect: { output: true },
  },
];

describe('isRoleCostHookHeld', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the verdict is read', () => {
        then('it returns the expected output', () => {
          expect(isRoleCostHookHeld(thisCase.given)).toEqual(
            thisCase.expect.output,
          );
        });
      });
    }),
  );
});
