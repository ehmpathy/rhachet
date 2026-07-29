import { getBrainSlugFull } from './getBrainSlugFull';

/**
 * .what = deduplicates brains by full slug (first wins)
 * .why  = the same brain can appear in multiple installed packages; the first-seen wins.
 *         exported (not inlined in getAvailableBrains) so the unit test calls the SAME
 *         function instead of a shadow-copy of the filter that could drift.
 */
export const asBrainsDeduped = <
  T extends { repo: string; slug: string },
>(input: {
  brains: T[];
}): T[] => {
  const slugsSeen = new Set<string>();
  return input.brains.filter((brain) => {
    const key = getBrainSlugFull(brain);
    if (slugsSeen.has(key)) return false;
    slugsSeen.add(key);
    return true;
  });
};
