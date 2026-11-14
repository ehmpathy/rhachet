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
