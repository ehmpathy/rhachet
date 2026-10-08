import { genSampleBootSpecCost as asCost } from '@src/.test/assets/genSampleBootSpecCost';
import { asBootCostSweepSummary } from '@src/domain.operations/boot/asBootCostSweepSummary';

/**
 * .what = the sweep header, one shape for every roster size
 * .why = the empty roster once headed `🧢 roles cost --all` while a full one headed
 *   `🧢 N boot specs — …`, so a reader saw two header forms for one report. each verdict is
 *   clamped here, the empty one above all (`rule.require.clamp-edge-cases`)
 */
const TEST_CASES = [
  {
    description: 'an empty roster says none were found, in the summary shape',
    given: { costs: [], over: [] },
    expect: { output: '🧢 0 boot specs — none found at the paths swept' },
  },
  {
    description: 'a roster with no cap says none declare a budget',
    given: { costs: [asCost({ tokens: 668 })], over: [] },
    expect: { output: '🧢 1 boot spec — none declare a budget' },
  },
  {
    description: 'a roster within its caps says so',
    given: {
      costs: [
        asCost({ tokens: 668, budget: 1_000 }),
        asCost({ tokens: 42, budget: null }),
      ],
      over: [],
    },
    expect: { output: '🧢 2 boot specs — 1 budgeted, all within budget' },
  },
  {
    description: 'a roster with a spec over its cap counts it',
    given: {
      costs: [asCost({ tokens: 9_000, budget: 5_000 })],
      over: [asCost({ tokens: 9_000, budget: 5_000 })],
    },
    expect: { output: '🧢 1 boot spec — 1 budgeted, 1 over budget' },
  },
];

describe('asBootCostSweepSummary', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const output = asBootCostSweepSummary(thisCase.given);
      expect(output).toEqual(thisCase.expect.output);
    }),
  );
});
