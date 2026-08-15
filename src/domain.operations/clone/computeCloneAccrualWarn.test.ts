import { computeCloneAccrualWarn } from './computeCloneAccrualWarn';

const TEST_CASES = [
  {
    description: 'below the threshold → no warn',
    given: { liveCount: 2, threshold: 5 },
    expect: { warn: false, liveCount: 2 },
  },
  {
    description: 'one below the threshold → no warn',
    given: { liveCount: 4, threshold: 5 },
    expect: { warn: false, liveCount: 4 },
  },
  {
    description:
      'AT the threshold → warn (>=, the count includes the fresh clone)',
    given: { liveCount: 5, threshold: 5 },
    expect: { warn: true, liveCount: 5 },
  },
  {
    description: 'above the threshold → warn',
    given: { liveCount: 9, threshold: 5 },
    expect: { warn: true, liveCount: 9 },
  },
] as const;

describe('computeCloneAccrualWarn', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(computeCloneAccrualWarn(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
