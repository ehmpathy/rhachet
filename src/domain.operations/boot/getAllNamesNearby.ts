import { getAllNamesWithinEditDistance } from '@src/utils/getAllNamesWithinEditDistance';

/**
 * .what = the most near-match offers one halt names
 * .why = past three, the list reads as a directory dump rather than a suggestion
 */
const NEARBY_OFFERS_MAX = 3;

/**
 * .what = the yaml names within an earned edit distance of what the caller typed, nearest first
 * .why = the near-match order is one decision — filter, score, threshold, sort, cap — and it
 *        reads as one name at the call site rather than a six-step pipeline
 */
export const getAllNamesNearby = (input: {
  names: string[];
  nameTyped: string;
}): string[] => {
  // a spec is a yaml file. every other neighbor is noise a caller did not ask about
  // 🔴 the threshold scales with the name: `a.yml` tolerates 1 edit, `boot.under.yml` 4
  const namesYaml = input.names.filter(
    (name) => name.endsWith('.yml') || name.endsWith('.yaml'),
  );
  return getAllNamesWithinEditDistance({
    names: namesYaml,
    nameTyped: input.nameTyped,
  }).slice(0, NEARBY_OFFERS_MAX);
};
