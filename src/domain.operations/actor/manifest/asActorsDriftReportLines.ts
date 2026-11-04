import type { ActorsDrift } from './getActorsDrift';

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
 * .what = the `.agent/` link path of a role specifier, for the unlink fix
 */
const asRoleLinkPath = (input: { role: string }): string => {
  const [repo, role] = input.role.split('/');
  return `.agent/repo=${repo}/role=${role}`;
};

/**
 * .what = the stdout lines of a manifest-driven init's actors report
 * .why = every manifest-driven init prints declared vs linked first, so drift is never silent:
 *        short → restored, extra → kept and named, with the one-line fix either way (F4)
 *
 * .note = a treestruct with no `:` separators (`rule.forbid.colons-in-stdout`)
 */
export const asActorsDriftReportLines = (input: {
  ambient: string;
  countActors: number;
  countRoles: number;
  drift: ActorsDrift;
  warnings: string[];
}): string[] => {
  // the summary rows
  const rowsSummary = [
    [`repo actor = ${input.ambient}`],
    [`${input.countActors} actor(s), ${input.countRoles} role(s) declared`],
  ];

  // short → restored, each with its declared source
  const rowShort = input.drift.short.length
    ? [
        'short → restored',
        ...input.drift.short.flatMap((one, index) =>
          asTreeBranch({
            lines: [`${one.role} ↺ linked${one.via ? `, via ${one.via}` : ''}`],
            isLast: index === input.drift.short.length - 1,
          }),
        ),
      ]
    : ['in sync, no role short'];

  // extra → kept, each with both fixes
  const rowExtra = input.drift.extra.length
    ? [
        'extra → kept, undeclared',
        ...input.drift.extra.flatMap((role, index) =>
          asTreeBranch({
            lines: [
              role,
              `├─ to keep it, declare \`${role}\` in .agent/actors.yml`,
              `└─ to drop it, unlink ${asRoleLinkPath({ role })}`,
            ],
            isLast: index === input.drift.extra.length - 1,
          }),
        ),
      ]
    : null;

  // the cautions, where a `-role` named a role its base lacks
  const rowCautions = input.warnings.length
    ? [
        'cautions',
        ...input.warnings.flatMap((note, index) =>
          asTreeBranch({
            lines: [note],
            isLast: index === input.warnings.length - 1,
          }),
        ),
      ]
    : null;

  // compose the tree
  const rows = [...rowsSummary, rowShort, rowExtra, rowCautions].filter(
    (row): row is string[] => row !== null,
  );
  return [
    '🎭 actors.yml',
    ...rows.flatMap((row, index) =>
      asTreeBranch({ lines: row, isLast: index === rows.length - 1 }).map(
        (line) => `   ${line}`,
      ),
    ),
    '',
  ];
};
