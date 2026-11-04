import { join } from 'node:path';
import { asActorOndiskDirName } from './asActorOndiskDirName';
import { getActorsRootDir } from './getActorsRootDir';
import { getOneRepoActorExid } from './getOneRepoActorExid';

/**
 * .what = the repo actor dir — `.agent/.actors/actor.via.repo=ambient`, or
 *         `actor.via.slug=<x>` under `ambient: '@<x>'`
 * .why = one owner of the path, for the brain dir render and the enroll excludes alike
 *        (D10). the repo actor holds the ambient roles, and only it (`term=ambient`)
 */
export const getOneRepoActorOndiskDir = (input: { repoPath: string }): string =>
  join(
    getActorsRootDir({ repoPath: input.repoPath }),
    asActorOndiskDirName({
      exid: getOneRepoActorExid({ repoPath: input.repoPath }),
    }),
  );
