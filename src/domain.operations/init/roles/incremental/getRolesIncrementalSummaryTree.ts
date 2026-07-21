/**
 * .what = renders the incremental init summary as a treestruct block
 * .why = the flat comma-joined summary buried role lists behind an ugly `none`
 *   value; a proper tree (additions / subtractions subtrees + an untouched count)
 *   reads cleanly and follows rule.require.treestruct-output
 *
 * .note = empty additions/subtractions sections are dropped (rule.forbid.surprises
 *   — no empty buckets); untouched is a count, not a wall of role names
 * .note = returns the full block from the `🔧` header, newline-joined with no
 *   trailing newline (the caller adds the blank lines around it)
 */
export const getRolesIncrementalSummaryTree = (input: {
  additions: { repo: string; role: string }[];
  subtractions: { repo: string; role: string }[];
  untouchedCount: number;
}): string => {
  // build the list of sections to render, in order, drop empty delta sections
  const sections: { kind: 'branch' | 'leaf'; text: string; lines: string[] }[] =
    [];

  // additions branch: `+ repo/role` children
  if (input.additions.length > 0)
    sections.push({
      kind: 'branch',
      text: 'additions',
      lines: input.additions.map((r) => `+ ${r.repo}/${r.role}`),
    });

  // subtractions branch: `- repo/role` children
  if (input.subtractions.length > 0)
    sections.push({
      kind: 'branch',
      text: 'subtractions',
      lines: input.subtractions.map((r) => `- ${r.repo}/${r.role}`),
    });

  // untouched leaf: a count, never a wall of names
  sections.push({
    kind: 'leaf',
    text: `untouched (${input.untouchedCount})`,
    lines: [],
  });

  // render each section under the header with the correct tree connectors
  const body = sections.flatMap((section, sectionIndex) => {
    const isLastSection = sectionIndex === sections.length - 1;
    const sectionConnector = isLastSection ? '└─' : '├─';
    const headerLine = `   ${sectionConnector} ${section.text}`;

    // leaf sections (untouched) have no children
    if (section.kind === 'leaf') return [headerLine];

    // branch children hang under the section, continued by │ unless it is last
    const childPrefix = isLastSection ? '   ' : '   │';
    const childLines = section.lines.map((line, childIndex) => {
      const isLastChild = childIndex === section.lines.length - 1;
      const childConnector = isLastChild ? '└─' : '├─';
      return `${childPrefix}  ${childConnector} ${line}`;
    });
    return [headerLine, ...childLines];
  });

  return ['🔧 init roles (incremental)', ...body].join('\n');
};
