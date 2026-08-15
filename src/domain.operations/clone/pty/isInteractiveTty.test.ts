import { isInteractiveTty } from './isInteractiveTty';

/**
 * .what = the interactive-terminal predicate over each isTTY shape
 */
const TEST_CASES: {
  description: string;
  given: { isTTY?: boolean };
  expect: boolean;
}[] = [
  {
    description: 'a real tty (isTTY true) is interactive',
    given: { isTTY: true },
    expect: true,
  },
  {
    description: 'a piped stream (isTTY false) is not interactive',
    given: { isTTY: false },
    expect: false,
  },
  {
    description: 'an absent isTTY is not interactive',
    given: {},
    expect: false,
  },
];

describe('isInteractiveTty', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(isInteractiveTty({ stdout: thisCase.given })).toEqual(
        thisCase.expect,
      );
    }),
  );
});
