import { getAllActorBootRevisionHashes } from '@src/domain.operations/boot/getAllActorBootRevisionHashes';

import { basename } from 'node:path';
import { getOneBootHashOfActor } from './fleet/getOneBootHashOfActor';
import { getAllCloneDirsForActor } from './getAllCloneDirsForActor';
import { getOneCloneBootSpawnedRef } from './getOneCloneBootSpawnedRef';

/**
 * .what = the hash of each boot revision of an actor that no clone which stays refers to
 * .why = a revision is kept for the clones that spawned on it; once the last of them is reaped,
 *        the revision holds a full boot copy for no reader, and the drift sweep still re-writes
 *        it on every `rhx init`. `rhx clone prune` reaps these beside the clones
 * .note = `serialsReaped` names the clones this prune reaps: their refs keep no revision. every
 *         other clone — LIVE, DEAF, DEAD on another host, or DEAD inside the age gate — keeps
 *         the revision it names, so a wake or a reach never meets a gone baseline
 * .note = the revision of the actor's current boot is never returned: a spawn writes that
 *         revision before its clone's ref, so a prune in that window must not take it
 * .note = an unreadable ref fails loud (via `getOneCloneBootSpawnedRef`): a prune that cannot
 *         read who refers to a revision reaps none of them
 */
export const getAllBootRevisionsUnreferenced = (input: {
  actorDir: string;
  serialsReaped: string[];
}): string[] => {
  // the hashes the clones that stay refer to
  const serialsReaped = new Set(input.serialsReaped);
  const hashesKept = new Set(
    getAllCloneDirsForActor({ actorDir: input.actorDir })
      .filter(
        (cloneDir) =>
          !serialsReaped.has(basename(cloneDir).slice('serial='.length)),
      )
      .map((cloneDir) => getOneCloneBootSpawnedRef({ cloneDir })),
  );

  // the current boot's revision stays, for the spawn that may be mid-write
  const hashCurrent = getOneBootHashOfActor({ actorDir: input.actorDir });

  // every other revision is held by no reader
  return getAllActorBootRevisionHashes({ actorDir: input.actorDir }).filter(
    (hash) => !hashesKept.has(hash) && hash !== hashCurrent,
  );
};
