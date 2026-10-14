import {
  REPO_ACTOR_DIR_NAME,
  REPO_ACTOR_DIR_NAME_LEGACY,
} from '@src/domain.operations/actor/enrolled/constants';
import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';

import { existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = move a legacy repo actor dir (`actor.via.slug=.default`) to its current name
 *         (`actor.via.repo=ambient`)
 * .why = the repo actor was renamed so the dir says what it is: namespace `repo` names the
 *        actor, value `ambient` names its roles. an extant repo still holds the legacy dir,
 *        and its tracked brain config must carry over, not be rebuilt from blank
 *
 * .note = only a legacy dir with no current dir moves. when both exist, the current dir is
 *         the live one and the legacy dir is left as is — the gitignore now ignores it
 * .note = the move is one `renameSync` within the actors root: atomic on POSIX, so a crash
 *         leaves either the old name or the new, never half of each
 */
export const setRepoActorDirFromLegacy = (input: {
  repoPath: string;
}): { effect: 'MOVED' | 'ABSENT' | 'SKIPPED' } => {
  const actorsRoot = getActorsRootDir({ repoPath: input.repoPath });
  const dirLegacy = join(actorsRoot, REPO_ACTOR_DIR_NAME_LEGACY);
  const dirCurrent = join(actorsRoot, REPO_ACTOR_DIR_NAME);

  // no legacy dir → no move owed
  if (!existsSync(dirLegacy)) return { effect: 'ABSENT' };

  // a current dir already exists → it is the live one; leave the legacy dir alone
  if (existsSync(dirCurrent)) return { effect: 'SKIPPED' };

  // move the legacy dir to its current name. a concurrent `rhx init` can win the move between
  //   the probe and the rename: either its current dir lands first (the rename refuses), or it
  //   moved the very legacy dir this call meant to move (the source is gone). both read as the
  //   SKIPPED this call would have seen a moment later, and every other fault is thrown
  try {
    renameSync(dirLegacy, dirCurrent);
  } catch (error) {
    if (isErrorOfCurrentDirPresent({ error })) return { effect: 'SKIPPED' };
    if (isErrorOfMoveByPeer({ error, dirLegacy, dirCurrent }))
      return { effect: 'SKIPPED' };
    throw error;
  }
  return { effect: 'MOVED' };
};

/**
 * .what = whether a rename failed because a peer already moved the legacy dir
 * .why = an ENOENT alone could be any absent path; only a source now gone AND a current dir
 *   now present proves the peer finished the same move
 */
const isErrorOfMoveByPeer = (input: {
  error: unknown;
  dirLegacy: string;
  dirCurrent: string;
}): boolean => {
  const code = (input.error as NodeJS.ErrnoException | null)?.code;
  if (code !== 'ENOENT') return false;
  return !existsSync(input.dirLegacy) && existsSync(input.dirCurrent);
};

/**
 * .what = whether a rename refused because its destination dir already holds entries
 * .note = linux reports ENOTEMPTY, and some platforms EEXIST, for the same refusal
 */
const isErrorOfCurrentDirPresent = (input: { error: unknown }): boolean => {
  const code = (input.error as NodeJS.ErrnoException | null)?.code;
  return code === 'ENOTEMPTY' || code === 'EEXIST';
};
