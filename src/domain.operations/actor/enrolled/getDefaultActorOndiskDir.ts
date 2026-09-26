import { join } from 'node:path';
import { DEFAULT_ACTOR_DIR_NAME } from './constants';
import { getActorsRootDir } from './getActorsRootDir';

/**
 * .what = the repo's reserved default actor dir — `.agent/.actors/actor.via.slug=.default`
 * .why = one owner of the reserved path, for the default brain dir render and the
 *        enroll excludes alike (D10)
 *
 * .note = the `.` marks the slug reserved, as `repo=.this` does
 */
export const getDefaultActorOndiskDir = (input: { repoPath: string }): string =>
  join(getActorsRootDir({ repoPath: input.repoPath }), DEFAULT_ACTOR_DIR_NAME);
