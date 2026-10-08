import type { BootSpecCost } from '@src/domain.operations/boot/getAllRepoBootSpecCosts';

/**
 * .what = the sweep's summary sentence — how many specs were costed, how many declare a cap,
 *         and how many sit over it
 * .why = the count, its plural, and its verdict are three decisions that would otherwise fuse
 *        into one template literal (`rule.require.named-transformers`)
 *
 * .note = it takes the ARRAYS rather than their lengths, so the caller cannot hand it a count
 *   it derived from a third set. the row-level peer takes the same shape for the same reason,
 *   and both are fed from one `costs` (`rule.forbid.inline-decode-friction`)
 *
 * 🔴 .note = the verdict clause reports over-budget specs and does NOT refuse them. this is a
 *   report; the halt lives at `roles boot`, which is the command that would spend the tokens.
 */
export const asBootCostSweepSummary = (input: {
  costs: BootSpecCost[];
  over: BootSpecCost[];
}): string => {
  const noun = `boot spec${input.costs.length === 1 ? '' : 's'}`;
  const budgeted = input.costs.filter((one) => one.budget !== null);

  // the empty roster heads with the same `🧢 N boot specs — …` shape as a full one, so a
  // reader scans one header form whatever the sweep found
  const verdict = ((): string => {
    if (input.costs.length === 0) return 'none found at the paths swept';
    if (budgeted.length === 0) return 'none declare a budget';
    if (input.over.length === 0)
      return `${budgeted.length} budgeted, all within budget`;
    return `${budgeted.length} budgeted, ${input.over.length} over budget`;
  })();

  return `🧢 ${input.costs.length} ${noun} — ${verdict}`;
};
