import { ConstraintError } from 'helpful-errors';

import { formatTokens } from '@src/utils/formatTokens';
import { getOneTreeElbow } from '@src/utils/getOneTreeElbow';

import { relative } from 'node:path';
import { asCountWord } from './asBootBudgetReadout';
import { asBudgetStrategyLines } from './asBudgetStrategyLines';
import { getAllBudgetStrategies } from './getAllBudgetStrategies';
import type { BootSpecCost } from './getAllRepoBootSpecCosts';

/**
 * .what = renders the onStop hook's refusal for owned boot specs over their cap
 * .why = the hook halt and the single-boot halt answer one breach, so they share one shape:
 *        the class line, each spec with its overage, the cost instrument, and the ladder
 *
 * .note = simple-mode ladder only. the sweep prices each spec whole, and a narrower
 *   `--subject` invocation leaves that whole-spec cost unchanged
 */
export const asBootSweepOverBudgetReadout = (input: {
  invocation: string;
  over: BootSpecCost[];
  cwd: string;
}): string[] => {
  const strategies = getAllBudgetStrategies({ mode: 'simple' });
  const noun = `boot spec${input.over.length === 1 ? '' : 's'}`;
  const paths = input.over.map((one) => relative(input.cwd, one.pathToSpec));

  return [
    `🧢 ${input.invocation}`,
    `   ├─ ${ConstraintError.emoji} ${ConstraintError.name}: ${input.over.length} ${noun} over budget`,
    ...input.over.map(
      (one, index) =>
        `   │  ${getOneTreeElbow({ index, length: input.over.length })} ${paths[index]} (${formatTokens({ tokens: one.tokens })} / ${formatTokens({ tokens: one.budget ?? 0 })} tokens)`,
    ),
    `   │`,
    `   ├─ some resources must go — you choose which`,
    ...paths.map(
      (path, index) =>
        `   │  ${getOneTreeElbow({ index, length: paths.length })} rhx cost --what ${path}   sorts every batch by what it costs`,
    ),
    `   │`,
    `   └─ fix — ${asCountWord({ count: strategies.length })} strategies, cheapest first`,
    ...asBudgetStrategyLines({ strategies }),
    ``,
  ];
};
