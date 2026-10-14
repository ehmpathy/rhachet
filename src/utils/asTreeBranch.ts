/**
 * .what = the branch glyph and the stem beneath it, for one item of a treestruct list
 * .why = a report tree draws `├─` for each item but the last, which draws `└─`; the rows nested
 *   under an item hang off `│  ` when more items follow and off blank space when none do. one
 *   owner keeps that pair from drift across the rows of one tree
 */
export const asTreeBranch = (input: {
  index: number;
  count: number;
}): { branch: '├─' | '└─'; stem: '│  ' | '   ' } => {
  const isLast = input.index === input.count - 1;
  return isLast ? { branch: '└─', stem: '   ' } : { branch: '├─', stem: '│  ' };
};
