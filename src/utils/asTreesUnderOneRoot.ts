/**
 * .what = joins treestructs that share one root line into a single tree under that root
 * .why = one command that names several facts must echo itself once; a second root line reads as
 *        a second run (rule.forbid.surprises)
 *
 * .note = each tree is `[root, ...branches, '']`, with its top-level branches at `   ├─` / `   └─`
 *   and their children at `   │  ` or, under the last branch, `      `. every tree but the last
 *   has its last branch turned `├─`, its children re-spined `│`, and a `│` spacer after it
 */
export const asTreesUnderOneRoot = (input: { trees: string[][] }): string[] => {
  const root = input.trees[0]?.[0];
  if (root === undefined) return [];

  // each body less its root and its final blank line; every body but the last is left open
  const bodies = input.trees.map((tree) => asTreeBody({ tree }));
  const bodiesJoined = bodies.flatMap((body, index) =>
    index < bodies.length - 1
      ? [...asTreeBodyLeftOpen({ body }), '   │']
      : body,
  );
  return [root, ...bodiesJoined, ''];
};

/**
 * .what = a tree's lines less its root line and its final blank line
 * .why = the joined tree keeps one root and one final blank line of its own
 */
const asTreeBody = (input: { tree: string[] }): string[] => {
  const body = input.tree.slice(1);
  return body[body.length - 1] === '' ? body.slice(0, -1) : body;
};

/**
 * .what = a tree body whose last top-level branch is turned from `└─` to `├─`
 * .why = a peer branch follows it, so its elbow and its children's spine must say so
 */
const asTreeBodyLeftOpen = (input: { body: string[] }): string[] => {
  const indexLast = input.body
    .map((line) => line.startsWith('   └─'))
    .lastIndexOf(true);
  if (indexLast < 0) return input.body;
  return input.body.map((line, index) => {
    if (index < indexLast) return line;
    if (index === indexLast) return line.replace(/^ {3}└─/, '   ├─');
    return line.replace(/^ {6}/, '   │  ');
  });
};
