import { getAllCloneDirsForActor } from './getAllCloneDirsForActor';
import { getCloneBootSpawnedRef } from './getCloneBootSpawnedRef';

/**
 * .what = the boot revision hash each clone of an actor spawned on, one per clone that holds a ref
 * .why = a render reports how many clones its drift reaches; a clone from before boot drift holds
 *        no ref and is left out
 * .note = an unreadable ref fails loud with its path
 */
export const getAllCloneBootSpawnedRefs = (input: {
  actorDir: string;
}): string[] =>
  getAllCloneDirsForActor({ actorDir: input.actorDir }).flatMap((cloneDir) => {
    const ref = getCloneBootSpawnedRef({ cloneDir });
    return ref === null ? [] : [ref];
  });
