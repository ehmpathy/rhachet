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
 * .what = split a tip on each `;` outside a backtick span, trimmed, blanks dropped
 * .why = a command in backticks may hold a `;` of its own, which must stay whole
 */
const asTipParts = (input: { tip: string }): string[] => {
  const segments = input.tip.split('`');
  const parts = segments.reduce<string[]>(
    (acc, segment, index) => {
      const prior = acc.slice(0, -1);
      const last = acc[acc.length - 1] ?? '';

      // inside ticks: keep whole, and restore the ticks the split removed
      const isInsideTicks = index % 2 === 1;
      const isTickClosed = index < segments.length - 1;
      if (isInsideTicks)
        return [...prior, `${last}\`${segment}${isTickClosed ? '`' : ''}`];

      // outside ticks: each `;` starts a new part
      const [first, ...rest] = segment.split(';');
      return [...prior, `${last}${first ?? ''}`, ...rest];
    },
    [''],
  );
  return parts.map((part) => part.trim()).filter(Boolean);
};
