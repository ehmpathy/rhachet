import { calcBudgetPercentUsed } from '@src/domain.operations/boot/calcBudgetPercentUsed';
import type { BootSpecCost } from '@src/domain.operations/boot/getAllRepoBootSpecCosts';
import { formatTokens } from '@src/utils/formatTokens';

/**
 * .what = the focus rows beneath one sweep row — what a boot of each declared subject costs
 * .why = a seat enrolled at `role::subject` spends the subject's tokens, so a reader who sizes
 *        that seat reads its row here rather than re-derives it from the whole-role cost
 *
 * .note = each row is checked against the spec's own cap, as the gate checks a focused boot
 * .note = the label is the focus suffix (`::101`), the exact token an enroll takes after a role
 * .note = naught renders for a spec that declares no subject
 */
export const asBootCostSweepSubjectLines = (input: {
  one: BootSpecCost;
  widthTokens: number;
}): string[] => {
  const { one } = input;
  return one.subjects.map((subject, index) => {
    const elbow = index === one.subjects.length - 1 ? '└─' : '├─';
    const tokensShown = formatTokens({ tokens: subject.tokens }).padStart(
      input.widthTokens,
    );
    const label = `::${subject.slug}`;

    // a spec with no declared cap has no headroom to report, for a focus as for the whole
    if (one.budget === null)
      return `   │  ${elbow} ${tokensShown} tokens  ${label}`;

    const percentUsed = calcBudgetPercentUsed({
      payload: { tokens: subject.tokens },
      budget: { tokens: one.budget },
    });
    const marker = subject.tokens > one.budget ? ' 🟡' : '';
    return `   │  ${elbow} ${tokensShown} / ${formatTokens({ tokens: one.budget })} tokens (${percentUsed}%)  ${label}${marker}`;
  });
};
