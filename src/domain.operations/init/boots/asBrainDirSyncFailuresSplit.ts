import { BrainDirOutsideRepoError } from '@src/domain.operations/actor/enrolled/BrainDirOutsideRepoError';

import type { syncBootsForBrainDirs } from './syncBootsForBrainDirs';

type BrainDirSyncFailure = Awaited<
  ReturnType<typeof syncBootsForBrainDirs>
>['failures'][number];

/**
 * .what = split the boot sweep's failures into the true failures and the skips — the brain
 *   dirs refused because they land outside the repo
 * .why = a skip is no error (the wish: exit 0, a visible warn), so it must never reach the
 *   exit code nor the stderr failure rows; it prints as a `⚠️` block instead
 */
export const asBrainDirSyncFailuresSplit = (input: {
  failures: BrainDirSyncFailure[];
}): { failures: BrainDirSyncFailure[]; skips: BrainDirOutsideRepoError[] } => ({
  failures: input.failures.filter(
    (failure) => !(failure.cause instanceof BrainDirOutsideRepoError),
  ),
  skips: input.failures.flatMap((failure) =>
    failure.cause instanceof BrainDirOutsideRepoError ? [failure.cause] : [],
  ),
});
