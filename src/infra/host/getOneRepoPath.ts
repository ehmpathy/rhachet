import { MalfunctionError } from 'helpful-errors';

import { realpathSync } from 'node:fs';

/**
 * .what = derive the ONE canonical absolute path for a repo root
 * .why =
 *   - the on-disk actor identity is keyed on { repoPath, hash }; if repoPath
 *     differs by a symlink hop or a trailing slash, the SAME repo fragments
 *     into two identities and clones stop sharing one actor dir
 *   - so every repoPath consumer threads this one derivation: expand symlinks
 *     (realpathSync) to the true path, and drop a trailing slash, so a
 *     worktree/symlinked cwd always canonicalizes to the same string
 *
 * .note = fails loud on a stale/pruned path — a repoPath that no longer exists
 *   on disk is a real fault, never a silently-accepted empty identity
 */
export const getOneRepoPath = (input: { from: string }): string => {
  // expand symlinks to the true path; a pruned/stale path faults here
  const real = (() => {
    try {
      return realpathSync(input.from);
    } catch (error) {
      return MalfunctionError.throw(
        'cannot canonicalize repoPath — the path is absent on disk',
        { from: input.from, cause: error instanceof Error ? error : undefined },
      );
    }
  })();

  // drop a single trailing slash so '/repo' and '/repo/' never fork identity
  return real.endsWith('/') && real.length > 1 ? real.slice(0, -1) : real;
};
