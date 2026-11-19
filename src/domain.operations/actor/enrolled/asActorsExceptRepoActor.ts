import type { ActorOndisk } from '@src/domain.objects/ActorOndisk';

/**
 * .what = the actors of a list, save the repo actor
 * .why = the repo actor's brain dir is `setRepoActorBrainDir`'s to render, so a sweep over the
 *        peers of the repo actor names that set rather than test the exid by hand
 */
export const asActorsExceptRepoActor = (input: {
  actors: ActorOndisk[];
  exidRepoActor: string;
}): ActorOndisk[] =>
  input.actors.filter((actor) => actor.exid !== input.exidRepoActor);
