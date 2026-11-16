/**
 * .what = the glyphs for one row of a treestruct list: its branch, and the stem its children hang from
 * .why = the last row closes the list (`└─`, a blank stem); every other row keeps it open (`├─`, `│`)
 */
export const asTreeBranchGlyphs = (input: {
  index: number;
  total: number;
}): { branch: string; stem: string } => {
  const isLast = input.index === input.total - 1;
  return { branch: isLast ? '└─' : '├─', stem: isLast ? '   ' : '│  ' };
};
