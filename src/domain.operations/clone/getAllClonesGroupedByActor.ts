import type { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';

import { getActorOndiskDir } from '../actor/enrolled/getActorOndiskDir';
import { getActorsRootDir } from '../actor/enrolled/getActorsRootDir';
import { getAllActorsOndisk } from '../actor/enrolled/getAllActorsOndisk';
import { getAllClonesForActor } from './getAllClonesForActor';

/**
 * .what = enumerate every enrolled actor with its clones grouped beneath it —
 *   the shape `rhx clone list` renders (each actor a header, its clones the rows)
 * .why =
 *   - the vision's `list` is a per-actor render: a human sees WHICH identity each
 *     clone belongs to, not a flat serial soup. this composes the two reads —
 *     the actors, then each actor's clones — into that grouped shape
 *   - the group logic lives here (not in the cli invoker), so a machine `--output
 *     json` and the human tree render the SAME grouped data, never two shapes
 *
 * .note = an actor with no clones still appears (an empty `clones` list), so a
 *   freshly-enrolled identity is visible before its first clone is enumerable
 */
export const getAllClonesGroupedByActor = (input: {
  repoPath: string;
}): { actor: ActorOndisk; clones: CloneOndisk[] }[] => {
  const actors = getAllActorsOndisk({ repoPath: input.repoPath });

  return actors.map((actor) => {
    // each actor's repoPath is already canonical (getAllActorsOndisk canonicalizes)
    const actorsRoot = getActorsRootDir({ repoPath: actor.repoPath });
    const actorDir = getActorOndiskDir({
      repoPath: actor.repoPath,
      hash: actor.hash,
    });
    const clones = getAllClonesForActor({
      actorDir,
      actorsRoot,
      repoPath: actor.repoPath,
      actorHash: actor.hash,
    });
    return { actor, clones };
  });
};
