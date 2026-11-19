import { getOneTreeElbow } from '@src/utils/getOneTreeElbow';

/**
 * .what = the `🪝 apply hooks to brains` tree: one branch per row, each row's leaves beneath it
 * .why = a fault row carries the fields its error names (what was refused, the fix) as leaves
 *   of its own branch, so they read as its detail and never as peer rows
 */
export const asHookSyncRowLines = (input: {
  rows: Array<{ head: string; leaves: string[] }>;
  indent: string;
}): string[] =>
  input.rows.flatMap((row, index) => {
    const isLast = index === input.rows.length - 1;
    const stem = `${input.indent}${isLast ? '   ' : '│  '}`;
    return [
      `${input.indent}${getOneTreeElbow({ index, length: input.rows.length })} ${row.head}`,
      ...row.leaves.map(
        (leaf, leafIndex) =>
          `${stem}${getOneTreeElbow({ index: leafIndex, length: row.leaves.length })} ${leaf}`,
      ),
    ];
  });
