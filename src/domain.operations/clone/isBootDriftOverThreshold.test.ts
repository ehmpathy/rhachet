import { given, then } from 'test-fns';

import { BOOT_DRIFT_NUDGE_LINES } from './BOOT_DRIFT_NUDGE_LINES';
import { isBootDriftOverThreshold } from './isBootDriftOverThreshold';

const TEST_CASES = [
  { lines: 0, over: false, description: 'no lines' },
  { lines: 199, over: false, description: 'one line under the threshold' },
  { lines: 200, over: false, description: 'exactly the threshold' },
  { lines: 201, over: true, description: 'one line over the threshold' },
];

describe('isBootDriftOverThreshold', () => {
  given('[case1] the threshold is 200 lines', () => {
    then('the constant is the documented 200', () => {
      expect(BOOT_DRIFT_NUDGE_LINES).toEqual(200);
    });

    TEST_CASES.map((testCase) =>
      then(
        `${testCase.description} (${testCase.lines}) → over = ${testCase.over}`,
        () => {
          expect(isBootDriftOverThreshold({ lines: testCase.lines })).toEqual(
            testCase.over,
          );
        },
      ),
    );
  });
});
