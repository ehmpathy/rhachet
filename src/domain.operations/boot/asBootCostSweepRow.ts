import type { RoleModPlan } from '@src/domain.objects/RoleModPlan';
import { calcBudgetPercentUsed } from '@src/domain.operations/boot/calcBudgetPercentUsed';
import type { BootSpecCost } from '@src/domain.operations/boot/getAllRepoBootSpecCosts';
import { isBootSpecOverBudget } from '@src/domain.operations/boot/isBootSpecOverBudget';
import { asRoleModCostTag } from '@src/domain.operations/mods/asRoleModCostTag';
import { formatTokens } from '@src/utils/formatTokens';

import { relative } from 'node:path';

/**
 * .what = one sweep row — what a spec costs, the headroom it has left, and where it lives
 * .why = the row fuses a percentage and two thousands-separated counts. each is arithmetic or
 *        format the reader would otherwise simulate inline (`rule.require.named-transformers`)
 *
 * .note = it reuses the shared `formatTokens` rather than a second local formatter, and the
 *   shared `calcBudgetPercentUsed` rather than a second copy of the percentage. one quantity,
 *   one format; one formula, one owner
 *
 * 🔴 .note = the row is NEVER terminal, so it takes no position and computes no elbow. the
 *   sweep prints `asBootCostSweepReachLines` beneath the roster UNCONDITIONALLY — on the
 *   populated arm and the empty one alike — so a peer always follows the last row, and a
 *   `└─` there would claim a terminus the render does not have. `├─` is a constant here
 *   rather than the `length - 1` case of a computation.
 *
 * ⚠️ .note = so the roster's terminal elbow lives at the reach block's own `└─ swept` header,
 *   which is the one line that IS last. a reader who adds a block below the reach must move
 *   that elbow rather than this one — the two are not interchangeable
 *   (`rule.forbid.snapshot-visual-blemishes`).
 *
 * 🔴 .note = the `(linked)` tag is the requirement-8 ownership split, carried to the REPORT
 *   grain. the gate already parts a spec this repo can write from one it cannot, and warns
 *   rather than halts on the second — but a reader of `--all` who cannot see that split reads
 *   every over-budget row as theirs to fix, and 13 of this repo's 15 specs are not. it tags
 *   the PATH rather than the verdict, because it is a fact about where the file lives.
 */
export const asBootCostSweepRow = (input: {
  one: BootSpecCost;
  cwd: string;
  widthTokens: number;

  /**
   * the plan of the mod this spec's role boots under; null for an unmodded role
   *
   * .note = a modded row is marked `[~] modded`, so a reader sees which roles differ from
   *   their published form, and by how much (usecase 4)
   * .note = `'stale'` = a modded view that lags its mod; `'refused'` = a mod the last render
   *   refused. the report marks each rather than refuses, since a sweep a human typed answers
   *   and never gates, and each names its own fix
   */
  plan: RoleModPlan | 'stale' | 'refused' | null;
}): string => {
  const { one } = input;
  const elbow = '├─';
  const pathShown = relative(input.cwd, one.pathToSpec);

  // a modded role's mark trails the row, after every other tag, so the columns before it hold
  const tagMod = ((): string => {
    if (input.plan === null) return '';
    if (input.plan === 'stale')
      return '  [~] modded, view not current (rhx init --hooks)';
    if (input.plan === 'refused')
      return '  [~] modded, refused (rhx roles boot names why)';
    return `  ${asRoleModCostTag({ plan: input.plan })}`;
  })();

  // .note = the first count is right-aligned across the roster, as it already is in the
  //   `where the tokens go` column (`asBootCostReadout`) and the `in scope` block
  //   (`asBootSubjectMarginLines`). the roster spans three orders of magnitude here — 668 to
  //   62,986 — and left-aligned digits deny the eye the one cue it uses to rank them
  //   (`def.ergonomic`, criterion 6: structure and alignment are preserved)
  const tokensShown = formatTokens({ tokens: one.tokens }).padStart(
    input.widthTokens,
  );

  // .note = words rather than a glyph. a new glyph owes a catalog row and a sense a reader
  //   must learn, where `(linked)` reads on contact and pairs with the note beneath the
  //   roster (`rule.prefer.emoji-language` — a glyph is claimed, never coined mid-render)
  const tagOwner = one.isForeign ? ' (linked)' : '';

  // a spec with no declared cap has a cost and no headroom to report. the column says so
  // rather than renders a blank a reader must interpret
  if (one.budget === null)
    return `   ${elbow} ${tokensShown} tokens (no budget)  ${pathShown}${tagOwner}${tagMod}`;

  const percentUsed = calcBudgetPercentUsed({
    payload: { tokens: one.tokens },
    budget: { tokens: one.budget },
  });

  // a row over its cap is marked on the row itself. the summary counts them; the row names
  // which — so a reader who scans the list never has to re-derive the arithmetic
  const marker = isBootSpecOverBudget({ one }) ? ' 🟡' : '';

  return `   ${elbow} ${tokensShown} / ${formatTokens({ tokens: one.budget })} tokens (${percentUsed}%)  ${pathShown}${tagOwner}${marker}${tagMod}`;
};
