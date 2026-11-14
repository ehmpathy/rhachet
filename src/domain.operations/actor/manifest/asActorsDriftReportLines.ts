import { asSlugBaseOfActorExid } from '@src/domain.operations/actor/enrolled/asSlugBaseOfActorExid';

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
 *        declared, unlinked → to link; extra → kept and named, with the one-line fix either way (F4)
 *
 * .note = a treestruct with no `:` separators (`rule.forbid.colons-in-stdout`)
 */
export const asActorsDriftReportLines = (input: {
  ambient: string;
  countActors: number;
  countRoles: number;
  drift: ActorsDrift;
  warnings: string[];
  /** the exids of declared-form actor dirs whose base slug the manifest no longer declares */
  actorsUndeclared: string[];
}): string[] => {
  // the summary rows
  const rowsSummary = [
    [`repo actor = ${input.ambient}`],
    [`${input.countActors} actor(s), ${input.countRoles} role(s) declared`],
  ];

  // declared, unlinked → to link, each with its declared source
  //   .note = "declared, unlinked" over the bare "short": a fresh install shows every role here,
  //     and "restored" implied the role had been linked before
  //   .note = "to link", never "linked": this report prints BEFORE the link runs, so a link that
  //     then fails must not have been announced as done. the `📚 link role` block reports the act
  const rowShort = input.drift.short.length
    ? [
        'declared, unlinked → to link',
        ...input.drift.short.flatMap((one, index) =>
          asTreeBranch({
            lines: [`${one.role}${one.via ? `, via ${one.via}` : ''}`],
            isLast: index === input.drift.short.length - 1,
          }),
        ),
      ]
    : ['in sync, every declared role linked'];

  // extra → kept, each with both fixes
  const rowExtra = input.drift.extra.length
    ? [
        'extra → kept, undeclared',
        ...input.drift.extra.flatMap((role, index) =>
          asTreeBranch({
            lines: [
              role,
              `├─ to keep it, declare \`${role}\` in .agent/actors.yml`,
              `└─ to drop it, rm ${asRoleLinkPath({ role })}`,
            ],
            isLast: index === input.drift.extra.length - 1,
          }),
        ),
      ]
    : null;

  // native → not booted, each with the one fix: declare it under the ambient actor
  const rowNative = input.drift.nativeUndeclared.length
    ? [
        'native → not booted, undeclared',
        ...input.drift.nativeUndeclared.flatMap((role, index) =>
          asTreeBranch({
            lines: [
              role,
              `└─ to boot it, declare \`${role}\` under ${input.ambient} in .agent/actors.yml`,
            ],
            isLast: index === input.drift.nativeUndeclared.length - 1,
          }),
        ),
      ]
    : null;

  // actor dirs → kept, where a base slug left the manifest; its clones may still live there,
  //   so init never deletes it, and names both fixes (F15)
  const rowActorsUndeclared = input.actorsUndeclared.length
    ? [
        'actor dirs → kept, slug undeclared',
        ...input.actorsUndeclared.flatMap((exid, index) =>
          asTreeBranch({
            lines: [
              `actor.via.${exid}`,
              `├─ to keep it, re-declare \`@${asSlugBaseOfActorExid({ exid })}\` in .agent/actors.yml`,
              '└─ to reap its dead clones, rhx clone prune',
            ],
            isLast: index === input.actorsUndeclared.length - 1,
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
            lines: [
              note,
              '└─ to quiet it, drop that `-role` from .agent/actors.yml',
            ],
            isLast: index === input.warnings.length - 1,
          }),
        ),
      ]
    : null;

  // compose the tree
  const rows = [
    ...rowsSummary,
    rowShort,
    rowExtra,
    rowNative,
    rowActorsUndeclared,
    rowCautions,
  ].filter((row): row is string[] => row !== null);
  return [
    '🎭 actors.yml',
    ...rows.flatMap((row, index) =>
      asTreeBranch({ lines: row, isLast: index === rows.length - 1 }).map(
        (line) => `   ${line}`,
      ),
    ),
  ];
  // .note = no blank at the end: every caller's next block (`🔧 init …`) opens on a blank of
  //   its own, so a blank here stacked two
};
