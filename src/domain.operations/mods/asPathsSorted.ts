/**
 * .what = a list of paths in code-point order, as a new list
 * .why = a role's files read in one order on every host, whatever order the walk met them in
 */
export const asPathsSorted = (input: { paths: string[] }): string[] =>
  [...input.paths].sort();
