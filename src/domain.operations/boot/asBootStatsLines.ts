import { formatTokens } from '@src/utils/formatTokens';

import { asBootStatsLinesUnbudgeted } from './asBootStatsLinesUnbudgeted';
import { calcBudgetPercentUsed } from './calcBudgetPercentUsed';

/**
 * .what = the `<stats>` block of a boot payload — resource counts, then the token total
 * .why = the block is emitted twice (header and footer) and its shape turns on two facts:
 *        whether any ref resources exist, and whether a budget was declared. named apart from
 *        `genBootPayload`, so the orchestrator reads as a narrative rather than a template
 *
 * .note = `counted` is the gate's own measurement, and it is present only where a budget was
 *   declared. where it is, the block reports the MEASURED count against the cap and drops the
 *   `chars / 4` estimate — two token numbers over two different scopes would read as a
 *   contradiction. where it is absent, the block reports the estimate against an `unlimited
 *   budget`, so a budgetless spec is called out on every boot
 *
 * 🔴 .note = `chars` is dropped on the budgeted branch, for the identical reason the estimate
 *   is. it sums SAY content alone, while the measured count covers the whole emitted render —
 *   so the two would sit on adjacent lines over different scopes. measured on
 *   `with-boot-budget-under`: `chars = 154` above `tokens = 107` reads as 1.44 chars per token,
 *   which no prose payload can be (real density there is ~3.3)
 */
export const asBootStatsLines = (input: {
  quant: {
    files: number;
    briefs: { say: number; ref: number };
    skills: { say: number; ref: number };
  };
  chars: number;
  budget: { tokens: number } | null;
  counted: { tokens: number } | null;
}): string[] => {
  const { quant, budget, counted } = input;
  const hasRefResources = quant.briefs.ref > 0 || quant.skills.ref > 0;

  // the resource-count rows, in the shape the payload's ref set calls for
  const linesQuant = hasRefResources
    ? [
        `  │   ├── briefs = ${quant.briefs.say + quant.briefs.ref}`,
        `  │   │   ├── say = ${quant.briefs.say}`,
        `  │   │   └── ref = ${quant.briefs.ref}`,
        `  │   └── skills = ${quant.skills.say + quant.skills.ref}`,
        `  │       ├── say = ${quant.skills.say}`,
        `  │       └── ref = ${quant.skills.ref}`,
      ]
    : [
        `  │   ├── briefs = ${quant.briefs.say}`,
        `  │   └── skills = ${quant.skills.say}`,
      ];

  // the final rows — the measured budget readout, or the extant estimate
  const linesTotal =
    counted && budget
      ? [
          `  ├── tokens = ${formatTokens({ tokens: counted.tokens })} (full emitted payload, o200k_base)`,
          `  └── budget = ${formatTokens({ tokens: counted.tokens })} / ${formatTokens({ tokens: budget.tokens })} tokens (${calcBudgetPercentUsed({ payload: counted, budget })}% used)`,
        ]
      : asBootStatsLinesUnbudgeted({ chars: input.chars });

  return [
    '<stats>',
    'quant',
    `  ├── files = ${quant.files}`,
    ...linesQuant,
    ...linesTotal,
    '</stats>',
    '',
  ];
};
