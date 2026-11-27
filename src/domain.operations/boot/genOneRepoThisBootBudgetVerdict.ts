import {
  ROLE_CONTENT_DEFECT_KINDS,
  type RoleContentDefect,
} from '@src/domain.objects/RoleContentDefect';

import {
  type BootSpecCost,
  getAllRepoBootSpecCosts,
} from './getAllRepoBootSpecCosts';
import { getAllRepoThisRoleContentDefects } from './getAllRepoThisRoleContentDefects';
import { getAllSpecsOverBudgetOwned } from './getAllSpecsOverBudgetOwned';
import { getOneRepoThisBootBudgetMemo } from './getOneRepoThisBootBudgetMemo';
import {
  GLOBS_REPO_THIS_BOOT,
  getOneRepoThisBootFingerprint,
} from './getOneRepoThisBootFingerprint';
import { setOneRepoThisBootBudgetMemo } from './setOneRepoThisBootBudgetMemo';

/**
 * .what = the memo shape version — bump the `v` when the cost of a spec, or what a detector
 *   finds, may change for the same inputs, so a prior verdict is not reused across the change
 *   (v3: the render walk skips `dist`, `node_modules`, `.git`)
 * .why = the content defect kinds join the version, so a new kind voids every memo written
 *   before its check existed, with no hand bump
 */
const MEMO_VERSION = ['v3', ...ROLE_CONTENT_DEFECT_KINDS].join('+');

/**
 * .what = the owned `.agent/repo=.this` boot specs over their budget, memoized
 * .why = the onStop hook asks this on every stop. most stops change naught under
 *        `.agent/repo=.this/role=*`, so a fingerprint match returns the prior clean verdict
 *        without a tokenizer load; any edit there reruns the sweep
 *
 * .note = only a CLEAN verdict is memoized. an over-budget verdict must hold every stop
 *   until it is fixed, and a recompute of it is the cost of the fix not yet made
 *
 * .note = the verb is `gen` — a findsert of the memo: a match returns the prior verdict, a miss
 *   computes it and writes a clean one to the self-ignored `.agent/.cache`
 *
 * .note = clean means naught over budget AND no content defect in a `.this` role: a content
 *   defect a birth set aside must hold every stop until a clone repairs it
 *   (`rule.forbid.content-checks-that-halt-enroll`). `v2` voids every memo a sweep wrote before
 *   the defects joined the verdict
 */
export const genOneRepoThisBootBudgetVerdict = async (input: {
  cwd: string;
}): Promise<{
  over: BootSpecCost[];
  defects: RoleContentDefect[];
  memo: 'hit' | 'miss';
}> => {
  const fingerprint = await getOneRepoThisBootFingerprint({
    cwd: input.cwd,
    version: MEMO_VERSION,
  });

  // a fingerprint match proves naught under `.this` changed since the last clean sweep
  const memo = getOneRepoThisBootBudgetMemo({ cwd: input.cwd });
  if (memo?.fingerprint === fingerprint)
    return { over: [], defects: [], memo: 'hit' };

  // the content defects a birth sets aside in the owned roles
  const defects = await getAllRepoThisRoleContentDefects({ cwd: input.cwd });

  // sweep the owned `.this` specs alone
  const { costs } = await getAllRepoBootSpecCosts({
    cwd: input.cwd,
    globs: GLOBS_REPO_THIS_BOOT,
    subjects: false,
  });
  const over = getAllSpecsOverBudgetOwned({ costs });

  // memoize a clean verdict only
  if (over.length === 0 && defects.length === 0)
    setOneRepoThisBootBudgetMemo({ cwd: input.cwd, fingerprint });
  return { over, defects, memo: 'miss' };
};
