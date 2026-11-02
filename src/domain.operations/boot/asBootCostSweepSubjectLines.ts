import { calcBudgetPercentUsed } from '@src/domain.operations/boot/calcBudgetPercentUsed';
import type { BootSpecCost } from '@src/domain.operations/boot/getAllRepoBootSpecCosts';
import { formatTokens } from '@src/utils/formatTokens';

/**
 * .what = the role a linked boot spec belongs to, read from its `role=<slug>` path segment
 * .note = null for a spec whose path names no role
 */
const asRoleSlugOfSpecPath = (input: { pathToSpec: string }): string | null =>
  /(?:^|\/)role=([^/]+)\//.exec(input.pathToSpec)?.[1] ?? null;

/**
 * .what = the focus rows beneath one sweep row — what a boot of each declared subject costs
 * .why = a seat enrolled at `role::subject` spends the subject's tokens, so a reader who sizes
 *        that seat reads its row here rather than re-derives it from the whole-role cost
 *
 * .note = each row is checked against the spec's own cap, as the gate checks a focused boot
 * .note = the label is the token an enroll takes (`mechanic::101`), so a reader can copy it.
 *         a spec whose path names no `role=` (a `.behavior` spec) shows the bare subject slug
 * .note = naught renders for a spec that declares no subject
 */
export const asBootCostSweepSubjectLines = (input: {
  one: BootSpecCost;
  widthTokens: number;
}): string[] => {
  const { one } = input;
  const role = asRoleSlugOfSpecPath({ pathToSpec: one.pathToSpec });
  return one.subjects.map((subject, index) => {
    const elbow = index === one.subjects.length - 1 ? '└─' : '├─';
    const tokensShown = formatTokens({ tokens: subject.tokens }).padStart(
      input.widthTokens,
    );
    const label = role === null ? subject.slug : `${role}::${subject.slug}`;

    // a spec with no declared cap says so, on a focus row as on its spec row
    if (one.budget === null)
      return `   │  ${elbow} ${tokensShown} tokens (no budget)  ${label}`;

    const percentUsed = calcBudgetPercentUsed({
      payload: { tokens: subject.tokens },
      budget: { tokens: one.budget },
    });
    const marker = subject.tokens > one.budget ? ' 🟡' : '';
    return `   │  ${elbow} ${tokensShown} / ${formatTokens({ tokens: one.budget })} tokens (${percentUsed}%)  ${label}${marker}`;
  });
};
