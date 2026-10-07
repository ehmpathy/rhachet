import {
  type BootSpecCost,
  getAllRepoBootSpecCosts,
} from './getAllRepoBootSpecCosts';
import { getAllSpecsOverBudgetOwned } from './getAllSpecsOverBudgetOwned';
import { getOneRepoThisBootBudgetMemo } from './getOneRepoThisBootBudgetMemo';
import {
  GLOBS_REPO_THIS_BOOT,
  getOneRepoThisBootFingerprint,
} from './getOneRepoThisBootFingerprint';
import { setOneRepoThisBootBudgetMemo } from './setOneRepoThisBootBudgetMemo';

/**
 * .what = the memo shape version — bump it when the cost of a spec may change for the same
 *   inputs, so a prior verdict is not reused across the change
 */
const MEMO_VERSION = 'v1';

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
 */
export const genOneRepoThisBootBudgetVerdict = async (input: {
  cwd: string;
}): Promise<{ over: BootSpecCost[]; memo: 'hit' | 'miss' }> => {
  const fingerprint = await getOneRepoThisBootFingerprint({
    cwd: input.cwd,
    version: MEMO_VERSION,
  });

  // a fingerprint match proves naught under `.this` changed since the last clean sweep
  const memo = getOneRepoThisBootBudgetMemo({ cwd: input.cwd });
  if (memo?.fingerprint === fingerprint) return { over: [], memo: 'hit' };

  // sweep the owned `.this` specs alone
  const { costs } = await getAllRepoBootSpecCosts({
    cwd: input.cwd,
    globs: GLOBS_REPO_THIS_BOOT,
  });
  const over = getAllSpecsOverBudgetOwned({ costs });

  // memoize a clean verdict only
  if (over.length === 0)
    setOneRepoThisBootBudgetMemo({ cwd: input.cwd, fingerprint });
  return { over, memo: 'miss' };
};
