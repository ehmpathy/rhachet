import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';

/**
 * .what = order clones spawnedAt asc, then serial asc as a deterministic tiebreak
 * .why = a `clone list` render must never reshuffle between reads
 *
 * .note = the sort is on a copy; the caller's array is never mutated
 */
export const asClonesInStableOrder = <
  T extends Pick<CloneOndisk, 'spawnedAt' | 'serial'>,
>(input: {
  clones: T[];
}): T[] =>
  [...input.clones].sort((a, b) => {
    if (a.spawnedAt !== b.spawnedAt) return a.spawnedAt < b.spawnedAt ? -1 : 1;
    if (a.serial === b.serial) return 0;
    return a.serial < b.serial ? -1 : 1;
  });
