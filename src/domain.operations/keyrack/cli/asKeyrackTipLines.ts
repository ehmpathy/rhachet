/**
 * .what = render a key row's tip as its last leaf, with each `;`-joined branch on its own sub-leaf
 * .why = a hint may carry several conditional branches joined by `;`. as one line it wraps
 *        mid-phrase in a terminal; the blocked report already splits the same hints into a
 *        sub-tree, so the key row reads the same way (`rule.forbid.surprises`)
 *
 * .note = a `;` inside a backtick span is part of a command a human may copy, so it never splits
 */
export const asKeyrackTipLines = (input: {
  indent: string;
  tip: string;
}): string[] => {
  // split on each `;` that sits outside a backtick span
  const [head, ...branches] = asTipParts({ tip: input.tip });

  // the tip ends the row, so its sub-leaves hang under a blank rail
  const lines = [`${input.indent}└─ \x1b[2mtip: ${head ?? ''}\x1b[0m`];
  branches.forEach((branch, index) => {
    const glyph = index === branches.length - 1 ? '└' : '├';
    lines.push(`${input.indent}   ${glyph}─ \x1b[2m${branch}\x1b[0m`);
  });
  return lines;
};

/**
 * .what = split a tip on each `;` outside a backtick span and outside parens, trimmed, blanks dropped
 * .why = a command in backticks may hold a `;` of its own, and a parenthetical aside may too
 *        (`(a skewed jwt also draws a 401; check the time sync first)`); a split there would cut
 *        the phrase and leave a `)` alone at the head of the next leaf
 */
const asTipParts = (input: { tip: string }): string[] => {
  const scan = [...input.tip].reduce<{
    parts: string[];
    isInsideTicks: boolean;
    parenDepth: number;
  }>(
    (state, char) => {
      const prior = state.parts.slice(0, -1);
      const last = state.parts[state.parts.length - 1] ?? '';

      // a `;` at the top level starts a new part
      const isSplit =
        char === ';' && !state.isInsideTicks && state.parenDepth === 0;
      if (isSplit) return { ...state, parts: [...state.parts, ''] };

      // any other char joins the current part, and moves the tick and paren state
      const isTick = char === '`';
      const parenStep = state.isInsideTicks
        ? 0
        : (char === '(' ? 1 : 0) - (char === ')' ? 1 : 0);
      return {
        parts: [...prior, `${last}${char}`],
        isInsideTicks: isTick ? !state.isInsideTicks : state.isInsideTicks,
        parenDepth: Math.max(0, state.parenDepth + parenStep),
      };
    },
    { parts: [''], isInsideTicks: false, parenDepth: 0 },
  );
  return scan.parts.map((part) => part.trim()).filter(Boolean);
};
