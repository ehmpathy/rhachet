/**
 * .what = render a branch of tree lines, with the last child closed
 */
const asTreeBranch = (input: { lines: string[]; isLast: boolean }): string[] =>
  input.lines.map((line, index) => {
    const isFirst = index === 0;
    if (isFirst) return `${input.isLast ? '└─' : '├─'} ${line}`;
    return `${input.isLast ? '  ' : '│ '} ${line}`;
  });

/**
 * .what = the stdout lines of a manifest-driven init's actors report
 * .why = init converges the linked roles to `.agent/actors.yml`, then names each change it made,
 *        one line per change, so a change is never silent and a clean run prints `in sync`
 *
 * .note = printed AFTER the link and the unlink pass, so it reports what is, never what is planned.
 *         a default path that always printed a defect would be the defect
 *         (rule.forbid.defective-defaults)
 * .note = a treestruct with no `:` separators (`rule.forbid.colons-in-stdout`)
 */
export const asActorsDriftReportLines = (input: {
  ambient: string;
  countActors: number;
  countRoles: number;
  /** the undeclared roles this pass unlinked, as `repo/role` */
  unlinked: string[];
  /** the declared roles still unlinked after the link pass — only where a link failed */
  unlinkedDeclared: { role: string; via: string | null }[];
  warnings: string[];
}): string[] => {
  // the summary rows
  const rowsSummary = [
    [`repo actor = ${input.ambient}`],
    [`${input.countActors} actor(s), ${input.countRoles} role(s) declared`],
  ];

  // one line per change made, or per declared role the link pass could not reach
  const rowsChange = [
    ...input.unlinked.map((role) => [`- unlinked ${role}, undeclared`]),
    ...input.unlinkedDeclared.map((one) => [
      `✋ declared, not linked ${one.role}${one.via ? `, via ${one.via}` : ''}`,
    ]),
    ...input.warnings.map((note) => [`⚠️ ${note}`]),
  ];

  // compose the tree; no change → in sync
  const rows = [
    ...rowsSummary,
    ...(rowsChange.length ? rowsChange : [['in sync']]),
  ];
  return [
    '🎭 actors.yml',
    ...rows.flatMap((row, index) =>
      asTreeBranch({ lines: row, isLast: index === rows.length - 1 }).map(
        (line) => `   ${line}`,
      ),
    ),
  ];
  // .note = no blank at the end: every caller's next block opens on a blank of its own, so a
  //   blank here stacked two
};
