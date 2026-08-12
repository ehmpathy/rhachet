import type { KeyrackFillTarget } from '@src/domain.operations/keyrack/fill/getAllKeyrackFillTargets';
import { asKeyrackKeyReachExid } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachExid';

/**
 * .what = the header line + child indent for one of `fill`'s per-reach branches
 * .why = a human reads this after `rhx keyrack fill` to see which reaches were
 *        provisioned, so it is a user-faced contract. as a pure function it can be
 *        snapped, which puts the shape in a pr diff rather than only in a terminal
 *
 * .note = `header` is null for a lone target. a key that declares no reach keeps today's
 *         FLAT shape byte for byte — no header line, no extra indent (e1)
 */
export const asKeyrackFillTargetBranch = (input: {
  target: KeyrackFillTarget;
  isLast: boolean;
  isLone: boolean;
  branchContinue: string;
}): { header: string | null; indent: string } => {
  if (input.isLone) return { header: null, indent: input.branchContinue };

  const exid = input.target.reach
    ? asKeyrackKeyReachExid({ reach: input.target.reach })
    : 'default';

  return {
    header: `   ${input.branchContinue}${input.isLast ? '└─' : '├─'} at reach ${exid}`,
    indent: `${input.branchContinue}${input.isLast ? '   ' : '│  '}`,
  };
};
