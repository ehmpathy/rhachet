import { getOneColumnWidth } from '@src/utils/getOneColumnWidth';
import { getOneTreeElbow } from '@src/utils/getOneTreeElbow';

import type { BudgetStrategy } from './getAllBudgetStrategies';

/**
 * .what = renders the ladder as tree rows, one line per rung, with the verb column aligned
 * .why = the alignment is arithmetic over the widest verb, and arithmetic inline in a render
 *        is decode-friction (`rule.forbid.inline-decode-friction`)
 *
 * .note = the column is padded by COMPUTE, never by spaces baked into a literal. a
 *   hand-aligned column drifts the moment a verb changes length, and the misalignment
 *   surfaces only in a snapshot (`rule.forbid.snapshot-visual-blemishes`)
 *
 * .note = the raise of `budget.tokens` is no rung, so it is not rendered here; the halt's
 *   hint names it once
 */
export const asBudgetStrategyLines = (input: {
  strategies: BudgetStrategy[];
}): string[] => {
  const widthVerb = getOneColumnWidth({
    cells: getAllVerbsOfStrategies({ strategies: input.strategies }),
  });

  return input.strategies.map((strategy, index) => {
    const elbow = getOneTreeElbow({
      index,
      length: input.strategies.length,
    });
    return `      ${elbow} ${strategy.verb.padEnd(widthVerb)}  ${strategy.gloss}`;
  });
};

/**
 * .what = the verb column of a ladder
 * .why = names the projection the column width is computed over
 */
const getAllVerbsOfStrategies = (input: {
  strategies: BudgetStrategy[];
}): string[] => input.strategies.map((strategy) => strategy.verb);
