/**
 * .what = a sorted copy of a list of paths; the input is left as is
 * .why = a disk walk enumerates in no fixed order; a scan that reads paths in sorted order
 *        prints its rows the same way on every host
 */
export const asPathsSorted = (input: { paths: readonly string[] }): string[] =>
  [...input.paths].sort();
