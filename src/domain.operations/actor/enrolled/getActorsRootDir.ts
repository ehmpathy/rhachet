import { join } from 'node:path';

/**
 * .what = derive the on-disk ROOT dir that holds every enrolled actor for a repo —
 *   `<repoPath>/.agent/.actors`
 * .why =
 *   - `.agent/.actors` is the single fact that names where the hash namespace
 *     lives. it was hand-rebuilt as a raw `join(repoPath, '.agent', '.actors')`
 *     literal across the enumerate + reach call graph — this transformer owns that
 *     one path so every reader routes through ONE format, never a scattered literal
 *   - pairs with asActorOndiskDirName (the per-actor token) so BOTH grains of the
 *     on-disk convention — the root AND the actor dir under it — are single-owned;
 *     a future relocation touches one owner, not a grep-hunt
 *
 * .note = `repoPath` must already be the getOneRepoPath-canonical realpath, so a
 *   symlink/worktree hop never forks the same root into two paths
 */
export const getActorsRootDir = (input: { repoPath: string }): string =>
  join(input.repoPath, '.agent', '.actors');
