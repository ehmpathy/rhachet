import type { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';
import { getAllClonesForActor } from '@src/domain.operations/clone/getAllClonesForActor';
import { getCloneReachState } from '@src/domain.operations/clone/getCloneReachState';

/**
 * .what = whether an actor has at least one clone that is not DEAD
 * .why = a LIVE or DEAF clone's brain still runs and re-reads its brain dir, so its
 *        actor's corpus must stay current; a DEAD clone reads naught, and a later
 *        spawn renders the corpus fresh before it boots
 *
 * .note = probes clone by clone and stops at the first one not DEAD
 */
export const isActorActive = async (input: {
  actor: ActorOndisk;
}): Promise<boolean> => {
  const clones = getAllClonesForActor({
    actorDir: getActorOndiskDir({
      repoPath: input.actor.repoPath,
      hash: input.actor.hash,
    }),
    actorsRoot: getActorsRootDir({ repoPath: input.actor.repoPath }),
    repoPath: input.actor.repoPath,
    actorHash: input.actor.hash,
  });

  // the first clone not DEAD settles it; each probe after that would be waste
  for (const clone of clones) {
    const state = await getCloneReachState({ clone });
    if (state !== 'DEAD') return true;
  }
  return false;
};
