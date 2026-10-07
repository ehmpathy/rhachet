import type { BootSpecCost } from '@src/domain.operations/boot/getAllRepoBootSpecCosts';
import { isBootSpecOverBudget } from '@src/domain.operations/boot/isBootSpecOverBudget';

/**
 * .what = the specs a sweep costed that sit OVER the cap they declared
 * .why = the sweep returns every spec it measured, budgeted or not, so `costs` means
 *        "measured" and never "within". a spec with no declared cap has no cap to exceed, so
 *        it is not a candidate.
 *
 * 🔴 .note = the summary line reads this list, so it can never claim `all within budget` on a
 *   roster whose rows carry an over-budget marker.
 */
export const getAllSpecsOverBudget = (input: {
  costs: BootSpecCost[];
}): BootSpecCost[] =>
  input.costs.filter((one) => isBootSpecOverBudget({ one }));
