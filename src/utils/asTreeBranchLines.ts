import { getOneTreeElbow } from './getOneTreeElbow';

/**
 * .what = one treestruct branch row per input row, each behind its elbow at a fixed indent
 * .why = the `├─` / `└─` choice per row is decode friction at every render site. named once,
 *        a render site reads as "these rows, under this stem" rather than an index loop
 */
export const asTreeBranchLines = (input: {
  rows: string[];
  indent: string;
}): string[] =>
  input.rows.map(
    (row, index) =>
      `${input.indent}${getOneTreeElbow({ index, length: input.rows.length })} ${row}`,
  );
