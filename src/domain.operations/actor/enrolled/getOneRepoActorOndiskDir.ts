import { join } from 'node:path';
import { REPO_ACTOR_DIR_NAME } from './constants';
import { getActorsRootDir } from './getActorsRootDir';

/**
 * .what = the repo actor dir — `.agent/.actors/actor.via.repo=ambient`
 * .why = one owner of the path, for the brain dir render and the enroll excludes alike
 *        (D10). the repo actor holds the ambient roles, and only it (`term=ambient`)
 */
export const getOneRepoActorOndiskDir = (input: { repoPath: string }): string =>
  join(getActorsRootDir({ repoPath: input.repoPath }), REPO_ACTOR_DIR_NAME);
