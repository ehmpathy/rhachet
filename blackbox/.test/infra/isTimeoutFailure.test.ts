import { given, then, when } from 'test-fns';

import { isTimeoutFailure } from './isTimeoutFailure';

const TEST_CASES = [
  {
    description: "jest's own case timeout",
    message: 'thrown: "Exceeded timeout of 90000 ms for a test."',
    expect: true,
  },
  {
    description: "the harness's bounded wait",
    message: 'ConstraintError: timed out after 15000ms for /ready/',
    expect: true,
  },
  {
    description: 'an assertion that failed',
    message: 'expect(received).toEqual(expected)',
    expect: false,
  },
];

describe('isTimeoutFailure', () => {
  given('[case1] the failure message of a test file', () => {
    TEST_CASES.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then(`isTimeoutFailure = ${thisCase.expect}`, () => {
          expect(isTimeoutFailure({ message: thisCase.message })).toEqual(thisCase.expect);
        });
      }),
    );
  });
});
