import { isPresent } from 'type-fns';

import { getAllCloneDirsForActor } from './getAllCloneDirsForActor';
import { getOneCloneBootSpawnedRef } from './getOneCloneBootSpawnedRef';

/**
 * .what = the boot revision hash each clone of an actor spawned on, plus the count of clones
 *         that hold no ref
 * .why = a render reports how many clones its drift reaches, and how many it cannot: a clone
 *        from before boot drift, or one spawned by a resume, holds no ref and takes no drift
 * .note = an unreadable ref fails loud with its path
 */
export const getAllCloneBootSpawnedRefs = (input: {
  actorDir: string;
}): { hashes: string[]; unreached: number } => {
  // one ref per clone, null where the clone holds none
  const refs = getAllCloneDirsForActor({ actorDir: input.actorDir }).map(
    (cloneDir) => getOneCloneBootSpawnedRef({ cloneDir }),
  );

  // the hashes the drift can reach, and the count of clones it cannot
  const hashes = refs.filter(isPresent);
  return { hashes, unreached: refs.length - hashes.length };
};
