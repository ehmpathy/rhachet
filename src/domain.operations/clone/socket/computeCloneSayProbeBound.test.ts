import { computeCloneSayProbeBound } from './computeCloneSayProbeBound';

const TEST_CASES = [
  {
    description: 'a capable read resets the bound to the base cadence',
    given: { boundPrior: 4000, probeMs: 3000, capable: true },
    expect: { bound: 1000 },
  },
  {
    description: 'a probe that used its whole bound doubles the next one',
    given: { boundPrior: 1000, probeMs: 1003, capable: false },
    expect: { bound: 2000 },
  },
  {
    description: 'the doubled bound never passes the one-shot default',
    given: { boundPrior: 4000, probeMs: 4010, capable: false },
    expect: { bound: 5000 },
  },
  {
    description:
      'a bound already at the default stays there after another timeout',
    given: { boundPrior: 5000, probeMs: 5002, capable: false },
    expect: { bound: 5000 },
  },
  {
    description: 'a blind reply inside its bound keeps the bound it had',
    given: { boundPrior: 2000, probeMs: 40, capable: false },
    expect: { bound: 2000 },
  },
];

describe('computeCloneSayProbeBound', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(computeCloneSayProbeBound(thisCase.given)).toEqual(
        thisCase.expect.bound,
      );
    }),
  );
});
