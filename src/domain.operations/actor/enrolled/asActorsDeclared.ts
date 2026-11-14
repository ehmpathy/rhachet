import type { ActorOndisk } from '@src/domain.objects/ActorOndisk';

import { isActorExidDeclared } from './isActorExidDeclared';

/**
 * .what = the declared actors of a list — every `slug=<x>` and `slug=<x>._.delta=<h>` actor
 * .why = the declared sweep (`setDeclaredActorsOndisk`) owns these, and only these
 */
export const asActorsDeclared = (input: {
  actors: ActorOndisk[];
}): ActorOndisk[] =>
  input.actors.filter((actor) => isActorExidDeclared({ exid: actor.exid }));
