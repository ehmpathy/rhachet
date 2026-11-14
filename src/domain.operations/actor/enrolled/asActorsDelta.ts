import type { ActorOndisk } from '@src/domain.objects/ActorOndisk';

import { asActorsExceptRepoActor } from './asActorsExceptRepoActor';
import { isActorExidDeclared } from './isActorExidDeclared';

/**
 * .what = the actors of a list that derive from the ambient set — every hash actor, save the
 *         repo actor and the declared actors
 * .why = a declared actor re-derives from `.agent/actors.yml` (`setDeclaredActorsOndisk`), and
 *        the repo actor is its own render, so the delta sweep owns the rest and only the rest
 */
export const asActorsDelta = (input: {
  actors: ActorOndisk[];
  exidRepoActor: string;
}): ActorOndisk[] =>
  asActorsExceptRepoActor(input).filter(
    (actor) => !isActorExidDeclared({ exid: actor.exid }),
  );
