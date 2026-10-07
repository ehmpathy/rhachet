import { formatTokens } from '@src/utils/formatTokens';

import { calcBudgetOverage } from './calcBudgetOverage';
import { calcBudgetPercentUsed } from './calcBudgetPercentUsed';

/**
 * .what = the three-row arithmetic block every over-budget readout opens with — the budget,
 *   the payload, and the overage between them
 *
 * .why = both rungs render this trio, and they differ in exactly ONE token: where the budget
 *   was declared. so it has one owner (`rule.forbid.domain-term-inconsistency`).
 *
 * .note = `declaredIn` is the one difference between the rungs, so it is the one input
 *
 * ⚠️ .note = the payload label states the SCOPE of the count, because the scope is the one
 *   property a reader cannot infer from the number. `calcBootPayloadTokens` counts the exact
 *   emitted string — both `<stats>` blocks, the readme, every say block, every ref line, the
 *   `<also>` block, and all XML chrome — so `full emitted payload` is what it is.
 *
 * ⚠️ .note = the rows are rendered at the `   │  ` depth every rung nests them under, so the
 *   block is a drop-in and no caller re-derives the indent.
 */
export const asBootOverageLines = (input: {
  budget: { tokens: number };
  payload: { tokens: number };
  declaredIn: string;
}): string[] => {
  const over = calcBudgetOverage({
    payload: input.payload,
    budget: input.budget,
  });
  const percent = calcBudgetPercentUsed({
    payload: input.payload,
    budget: input.budget,
  });

  return [
    `   │  ├─ budget   = ${formatTokens({ tokens: input.budget.tokens })} tokens   (${input.declaredIn})`,
    `   │  ├─ payload  = ${formatTokens({ tokens: input.payload.tokens })} tokens   (full emitted payload, o200k_base)`,
    `   │  └─ over by  = ${formatTokens({ tokens: over })} tokens   (${percent}% of budget)`,
  ];
};
