import { calcBudgetPercentUsed } from './calcBudgetPercentUsed';

/**
 * .what = clamps the one percent three surfaces report — the stats block, the breach readout,
 *   and the sweep row
 * .why = the formula is declared once so the three cannot disagree. these rows pin its edges:
 *   the exact budget, the half-percent round, and an overage past 100
 */
const TEST_CASES = [
  {
    description: 'a payload that equals its budget reads exactly 100',
    given: { payload: { tokens: 5_000 }, budget: { tokens: 5_000 } },
    expect: { output: 100 },
  },
  {
    description: 'a half percent rounds up, never down',
    given: { payload: { tokens: 1 }, budget: { tokens: 200 } },
    expect: { output: 1 },
  },
  {
    description: 'a share under a half percent rounds to zero',
    given: { payload: { tokens: 1 }, budget: { tokens: 1_000 } },
    expect: { output: 0 },
  },
  {
    description: 'an overage reads past 100, never clamped',
    given: { payload: { tokens: 7_000 }, budget: { tokens: 5_000 } },
    expect: { output: 140 },
  },
];

describe('calcBudgetPercentUsed', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(calcBudgetPercentUsed(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
