import { basename, dirname } from 'node:path';
import type { BrainDirOutsideRepoError } from './BrainDirOutsideRepoError';
import { REPO_ACTOR_DIR_NAME } from './constants';

/**
 * .what = what a skipped brain dir missed out on, in the human's words
 * .why = every actor derives its settings from the repo actor's, and the hook sync waits on the
 *   repo actor's boot. so a skipped repo actor costs every actor its hooks, not one dir its own
 * .note = a brain dir sits at `<actors>/<actor dir>/brain/.claude`
 */
const asSkipEffect = (input: { path: string }): string =>
  basename(dirname(dirname(input.path))) === REPO_ACTOR_DIR_NAME
    ? 'the repo actor got no boot, and no actor gets its role hooks until it does'
    : 'that brain dir got no hooks and no boot from this run';

/**
 * .what = the `⚠️ skipped a write outside the repo` block for one refused brain dir
 * .why = a skip is not an error: the human's box holds a shape rhachet must not touch, and
 *   naught is broken for the repo. the block names the path, where it lands, what that dir
 *   did not get, and the fix — so an exit 0 never reads as "the hooks landed"
 */
export const asBrainDirOutsideRepoWarnLines = (input: {
  error: BrainDirOutsideRepoError;
}): string[] => [
  '⚠️ skipped a write outside the repo',
  `   ├─ path = ${input.error.metadata?.path}`,
  `   ├─ lands at = ${input.error.metadata?.landsAt}`,
  `   ├─ effect = ${asSkipEffect({ path: input.error.metadata?.path ?? '' })}`,
  `   └─ hint = ${input.error.metadata?.hint}`,
];
