import type { BootSpecCost } from '@src/domain.operations/boot/getAllRepoBootSpecCosts';

/**
 * .what = whether one costed spec sits OVER the cap it declared
 * .why = the sweep row marks it, the summary counts it, and the gate refuses it. one predicate
 *        means the three can never disagree about which rows are over
 *
 * .note = a spec with no declared cap has no cap to exceed, so it is never over
 */
export const isBootSpecOverBudget = (input: { one: BootSpecCost }): boolean =>
  input.one.budget !== null && input.one.tokens > input.one.budget;
