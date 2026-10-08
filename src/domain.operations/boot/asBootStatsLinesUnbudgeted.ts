import { COST_PER_MILLION_TOKENS } from '../brainCost/constants';

/**
 * .what = the char-derived token estimate the extant `<stats>` block reports
 * .why = it is an ESTIMATE, and the name says so. the gate never reads this number —
 *        `calcBootPayloadTokens` measures the real one — so a reader who finds the two side
 *        by side can tell at a glance which is which (`rule.require.named-transformers`)
 *
 * .note = it sums say content alone at 4 chars/token, so it understates the payload; an
 *   unbudgeted boot never loads the tokenizer, and a budgeted boot reports the measured count
 */
const calcBootTokensEstimated = (input: { chars: number }): number =>
  Math.ceil(input.chars / 4);

/**
 * .what = an estimated token count, rendered as the dollar figure the stats line quotes
 * .why = the format is arithmetic plus a regex trim, which is decode-friction inline in a
 *        render (`rule.forbid.inline-decode-friction`)
 *
 * .note = the regex trims the zeros at the end and a bare `.`, so `$1.00` reads `$1` and
 *   `$0.50` reads `$0.5`.
 *   below a cent it reads `< $0.01` rather than `$0`, since `$0` would claim the boot is
 *   free.
 */
const asBootCostHuman = (input: { tokens: number }): string => {
  const cost = (input.tokens / 1_000_000) * COST_PER_MILLION_TOKENS;
  if (cost < 0.01) return '< $0.01';
  return `$${cost.toFixed(2).replace(/\.?0+$/, '')}`;
};

/**
 * .what = the two `<stats>` total rows a boot with NO declared budget prints
 * .why = a spec with no budget is called out as budgetless on every boot. the cap stays
 *        opt-in, but an uncapped payload says so in the one block every reader of the boot
 *        sees, so the absence is a visible choice rather than a silent default
 *
 * .note = the `≈` marks it an estimate; a budgeted boot reports the measured count
 */
export const asBootStatsLinesUnbudgeted = (input: {
  chars: number;
}): string[] => {
  const tokens = calcBootTokensEstimated({ chars: input.chars });
  return [
    `  ├── chars = ${input.chars}`,
    `  └── tokens ≈ ${tokens} / unlimited budget (${asBootCostHuman({ tokens })} at $${COST_PER_MILLION_TOKENS}/mil)`,
  ];
};
