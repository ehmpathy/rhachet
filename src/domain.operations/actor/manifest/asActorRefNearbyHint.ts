import { getAllNamesWithinEditDistance } from '@src/utils/getAllNamesWithinEditDistance';

/**
 * .what = the hint for an actor ref no actor answers: the nearest declared slug, then the rest
 * .why = a typo in a base, in `ambient:`, or in `rhx clone @<slug>` reads at once as a typo when
 *        the refusal names the slug the caller meant (vision, edge row one)
 *
 * .note = the threshold scales with the slug, so a short slug cannot match a distant peer — the
 *   same rule `getAllNamesNearby` applies to a spec name
 */
export const asActorRefNearbyHint = (input: {
  ref: string;
  slugs: string[];
}): string => {
  // the nearest declared slug within an earned distance, if any
  const slugTyped = input.ref.replace(/^@/, '');
  const nearest = getAllNamesWithinEditDistance({
    names: input.slugs,
    nameTyped: slugTyped,
  })[0];

  // the full list, so a caller with no near match still sees every option
  const list = input.slugs.map((slug) => `'@${slug}'`).join(', ');
  if (!nearest) return `use one of ${list}`;
  return `did you mean '@${nearest}'? declared: ${list}`;
};
