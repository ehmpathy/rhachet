import type { ActorOndisk } from '@src/domain.objects/ActorOndisk';

/**
 * .what = order actors by exid low→high
 * .why = an `actor list` render must never reshuffle between reads
 *
 * .note = the sort is on a copy; the caller's array is never mutated
 */
export const asActorsInStableOrder = <
  T extends Pick<ActorOndisk, 'exid'>,
>(input: {
  actors: T[];
}): T[] =>
  [...input.actors].sort((a, b) => {
    if (a.exid === b.exid) return 0;
    return a.exid < b.exid ? -1 : 1;
  });
