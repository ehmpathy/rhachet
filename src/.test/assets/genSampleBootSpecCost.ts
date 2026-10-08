import type { BootSpecCost } from '@src/domain.operations/boot/getAllRepoBootSpecCosts';

/**
 * .what = a `BootSpecCost` fixture, with sane defaults for every field
 * .why = `asBootCostSweepRow.test.ts` and `isBootSpecOverBudget.test.ts` each build cost
 *   rows to exercise their own operation, so they share one defaulted shape rather than
 *   two hand-kept copies
 */
export const genSampleBootSpecCost = (
  input: Partial<BootSpecCost>,
): BootSpecCost => ({
  pathToSpec: '/repo/.agent/repo=.this/role=any/boot.yml',
  tokens: 100,
  budget: null,
  isForeign: false,
  ...input,
});
