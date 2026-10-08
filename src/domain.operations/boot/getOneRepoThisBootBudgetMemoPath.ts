import { join } from 'node:path';

/**
 * .what = where the `.this` within-budget verdict is memoized
 * .why = `.agent/.cache` is the host-local, self-ignored home for rhachet's caches, and the
 *        read and the write must agree on one path
 */
export const getOneRepoThisBootBudgetMemoPath = (input: {
  cwd: string;
}): string =>
  join(
    input.cwd,
    '.agent/.cache/repo=rhachet/skill=roles-cost/when=hook.onStop.json',
  );
