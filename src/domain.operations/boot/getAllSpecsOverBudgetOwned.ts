import type { BootSpecCost } from '@src/domain.operations/boot/getAllRepoBootSpecCosts';
import { getAllSpecsOverBudget } from '@src/domain.operations/boot/getAllSpecsOverBudget';

/**
 * .what = the specs over their cap that THIS repo owns — the set a budget refusal names
 * .why = a `(linked)` spec over its cap is its supplier's to fix, so it is reported and never
 *        refused (requirement 8). the hand-run sweep and the onStop hook refuse the same set,
 *        so the ownership split has one owner rather than a predicate at each call site
 */
export const getAllSpecsOverBudgetOwned = (input: {
  costs: BootSpecCost[];
}): BootSpecCost[] =>
  getAllSpecsOverBudget({ costs: input.costs }).filter((one) => !one.isForeign);
