import { isCloneSocketEligible } from './isCloneSocketEligible';

/**
 * .what = the socket-eligibility gate over the {brain, interactive, noSocket} cube
 * .note = 'claude' is socket-capable, so these cases vary the two other axes; the
 *   brain-capability axis is proven in isBrainSocketCapable's own test
 */
const TEST_CASES: {
  description: string;
  given: { interactive: boolean; noSocket: boolean };
  expect: boolean;
}[] = [
  {
    description: 'capable + interactive + not-opted-out → eligible',
    given: { interactive: true, noSocket: false },
    expect: true,
  },
  {
    description: 'capable but NON-interactive (headless) → not eligible',
    given: { interactive: false, noSocket: false },
    expect: false,
  },
  {
    description: 'capable + interactive but --no-socket → not eligible',
    given: { interactive: true, noSocket: true },
    expect: false,
  },
];

describe('isCloneSocketEligible', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(
        isCloneSocketEligible({
          brain: 'claude',
          interactive: thisCase.given.interactive,
          noSocket: thisCase.given.noSocket,
        }),
      ).toEqual(thisCase.expect);
    }),
  );
});
