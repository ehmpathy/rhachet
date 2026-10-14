import { join } from 'node:path';
import { asActorOndiskDirName } from './asActorOndiskDirName';
import { getActorsRootDir } from './getActorsRootDir';

/**
 * .what = derive the on-disk dir for an actor — `.agent/.actors/actor.via.<exid>`
 * .why =
 *   - every actor lives under its exid: the repo actor at `actor.via.repo=ambient`, a
 *     hash actor at `actor.via.hash=<h>`. the dir holds the shared brain config, the
 *     roles log, and the clones
 *   - the dir is DERIVED fresh from { repoPath, exid } on every read — it is never
 *     stored on the record — so a moved/renamed repo never carries a stale path
 *
 * .note = `repoPath` must already be the getOneRepoPath-canonical realpath, so
 *   a symlink/worktree hop never forks the same actor into two dirs
 */
export const getActorOndiskDir = (input: {
  repoPath: string;
  exid: string;
}): string =>
  join(
    getActorsRootDir({ repoPath: input.repoPath }),
    asActorOndiskDirName({ exid: input.exid }),
  );
