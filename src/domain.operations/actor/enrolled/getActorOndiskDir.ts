import { join } from 'node:path';
import { asActorOndiskDirName } from './asActorOndiskDirName';
import { getActorsRootDir } from './getActorsRootDir';

/**
 * .what = derive the on-disk dir for an anonymous enrolled actor
 * .why =
 *   - every `rhx enroll` lands under `.agent/.actors/actor.via.hash=<hash>/`,
 *     the hash namespace enroll owns (never `actors.yml`). the dir holds the
 *     shared brain config, the roles log, and the clones
 *   - the dir is DERIVED fresh from { repoPath, hash } on every read — it is
 *     never stored on the record — so a moved/renamed repo never carries a
 *     stale path
 *
 * .note = `repoPath` must already be the getOneRepoPath-canonical realpath, so
 *   a symlink/worktree hop never forks the same actor into two dirs
 */
export const getActorOndiskDir = (input: {
  repoPath: string;
  hash: string;
}): string =>
  join(
    getActorsRootDir({ repoPath: input.repoPath }),
    asActorOndiskDirName({ hash: input.hash }),
  );
