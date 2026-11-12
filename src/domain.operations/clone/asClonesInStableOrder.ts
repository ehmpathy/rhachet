import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';

/**
 * .what = order clones spawnedAt asc, then serial asc as a deterministic tiebreak
 * .why = a `clone list` render must never reshuffle between reads
 *
 * .note = the sort is on a copy; the caller's array is never mutated
 * .note = spawnedAt compares as an instant, never as text: `now()` drops a zero millisecond
 *   part (`…:10Z`), and as text `…:10.500Z` sorts before `…:10Z`, since `.` < `Z`
 */
export const asClonesInStableOrder = <
  T extends Pick<CloneOndisk, 'spawnedAt' | 'serial'>,
>(input: {
  clones: T[];
}): T[] =>
  [...input.clones].sort((a, b) => {
    const spawnedAtDiffMs = Date.parse(a.spawnedAt) - Date.parse(b.spawnedAt);
    if (spawnedAtDiffMs !== 0) return spawnedAtDiffMs;
    if (a.serial === b.serial) return 0;
    return a.serial < b.serial ? -1 : 1;
  });
