import { genSampleBootSpecCost as asCost } from '@src/.test/assets/genSampleBootSpecCost';
import { isBootSpecOverBudget } from '@src/domain.operations/boot/isBootSpecOverBudget';

const TEST_CASES = [
  {
    description: 'a spec with no cap is never over',
    given: { tokens: 999_999, budget: null },
    expect: { output: false },
  },
  {
    description: 'a spec under its cap is not over',
    given: { tokens: 4_000, budget: 5_000 },
    expect: { output: false },
  },
  {
    description: 'a spec exactly at its cap is not over',
    given: { tokens: 5_000, budget: 5_000 },
    expect: { output: false },
  },
  {
    description: 'a spec one token past its cap is over',
    given: { tokens: 5_001, budget: 5_000 },
    expect: { output: true },
  },
];

describe('isBootSpecOverBudget', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isBootSpecOverBudget({ one: asCost(thisCase.given) })).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
