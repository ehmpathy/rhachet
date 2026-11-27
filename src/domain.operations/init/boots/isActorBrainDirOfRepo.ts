import { asActorOndiskExidFromDirName } from '@src/domain.operations/actor/enrolled/asActorOndiskExidFromDirName';
import { REPO_ACTOR_DIR_NAME_LEGACY } from '@src/domain.operations/actor/enrolled/constants';
import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';

import { basename, dirname } from 'node:path';

/**
 * .what = whether a path is the brain dir of an actor dir in this repo's actors root — the
 *         legacy `actor.via.slug=.default`, or any actor rhachet mints
 * .why = such a link is rhachet's own prior link to a former repo actor, so the layout step
 *        repoints it and the preflight passes it; a link to any other place is the human's,
 *        and is refused
 */
export const isActorBrainDirOfRepo = (input: {
  repoPath: string;
  path: string;
}): boolean => {
  const actorDir = dirname(dirname(input.path));
  if (dirname(actorDir) !== getActorsRootDir({ repoPath: input.repoPath }))
    return false;
  if (getBrainOndiskDir({ actorDir }) !== input.path) return false;
  const dirName = basename(actorDir);
  return (
    dirName === REPO_ACTOR_DIR_NAME_LEGACY ||
    asActorOndiskExidFromDirName({ dirName }) !== null
  );
};
