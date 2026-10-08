/**
 * .what = the most near-match offers one halt names
 * .why = past three, the list reads as a directory dump rather than a suggestion
 */
const NEARBY_OFFERS_MAX = 3;

/**
 * .what = the edit distance between two names, row by row
 * .why = a distance threshold parts a typo (`boot.yaml` for `boot.yml`) from an unrelated
 *        neighbor
 *
 * .note = the classic levenshtein recurrence. the inputs are FILENAMES, so the quadratic
 *   term is bounded by one path segment.
 */
export const calcEditDistance = (input: {
  from: string;
  into: string;
}): number => {
  const { from, into } = input;

  // 🟡 .note = DELIBERATE MUTATION — two bindings: `rowPrior` is reassigned per row, and each
  //   `rowNext` grows by `push` across its own columns; the loop counters `i` and `j` are
  //   covered by the same grant
  //   1. each cell depends on its own row's predecessor AND the prior row, so the sequence
  //      is what the loop computes; there is no fixed sequence to reduce over
  //   2. both rows are scoped to this body and escape only as the returned number
  //   ⇒ the grant `rule.require.immutable-vars` requires, stated at the site
  let rowPrior = Array.from({ length: into.length + 1 }, (_, index) => index);

  for (let i = 0; i < from.length; i += 1) {
    const rowNext = [i + 1];
    for (let j = 0; j < into.length; j += 1)
      rowNext.push(
        Math.min(
          rowPrior[j + 1]! + 1, // a deletion
          rowNext[j]! + 1, // an insertion
          rowPrior[j]! + (from[i] === into[j] ? 0 : 1), // a substitution
        ),
      );
    rowPrior = rowNext;
  }

  return rowPrior[into.length]!;
};

/**
 * .what = the yaml names within an earned edit distance of what the caller typed, nearest first
 * .why = the near-match order is one decision — filter, score, threshold, sort, cap — and it
 *        reads as one name at the call site rather than a six-step pipeline
 */
export const getAllNamesNearby = (input: {
  names: string[];
  nameTyped: string;
}): string[] => {
  // 🔴 the threshold scales with the name, so a short name cannot match a distant peer:
  //    `a.yml` tolerates 1 edit, `boot.under.yml` tolerates 4
  const distanceAllowed = Math.max(1, Math.floor(input.nameTyped.length / 3));

  return (
    input.names
      // a spec is a yaml file. every other neighbor is noise a caller did not ask about
      .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
      .map((name) => ({
        name,
        distance: calcEditDistance({ from: input.nameTyped, into: name }),
      }))
      .filter((one) => one.distance <= distanceAllowed)
      .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name))
      .slice(0, NEARBY_OFFERS_MAX)
      .map((one) => one.name)
  );
};
