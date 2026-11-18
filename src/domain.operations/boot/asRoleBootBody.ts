import type { RoleModPlan } from '@src/domain.objects/RoleModPlan';
import { asRoleModAttr } from '@src/domain.operations/mods/asRoleModAttr';
import { asRoleModNoticeLines } from '@src/domain.operations/mods/asRoleModNoticeLines';

import { relative } from 'node:path';
import type { BootStats } from './BootStats';
import type { BootPlan } from './computeBootPlan';

/**
 * .what = compose one role's boot body and its census from a plan and the said contents
 * .why = the body shape is pure compute; the reads that feed it stay with the caller
 *
 * .note = the body holds no `<stats>` block, so a render is byte-stable across runs
 */
export const asRoleBootBody = (input: {
  slugRepo: string;
  slugRole: string;
  roleDir: string;
  bootPlan: BootPlan;
  readme: { path: string; content: string } | null;
  briefsSaid: { path: string; content: string }[];
  skillsSaid: { path: string; content: string }[];

  /**
   * the focus this role renders at; null for a whole role
   *
   * .note = a focused render omits `<also>`, so this line is how the clone learns the
   *   other subjects exist, and whether the role's `always` block was shed
   */
  focus: { given: string[]; elsewhere: string[]; alwaysShed: boolean } | null;

  /**
   * the mod this role boots under; null for an unmodded role
   *
   * .note = a modded role opens with a notice, and each modded resource carries a `mod` attr
   */
  mod: { ofLabel: string; plan: RoleModPlan } | null;
}): { body: string; stats: BootStats } => {
  const { bootPlan, readme, briefsSaid, skillsSaid, focus, mod } = input;

  // a modded role names its mod first, so the clone knows its role differs from the published
  const linesMod = mod
    ? asRoleModNoticeLines({ of: mod.ofLabel, plan: mod.plan })
    : [];

  // a focused role names its focus first, so the clone reads the scope before the content
  const linesFocus = focus
    ? [
        `<focus given="${focus.given.join(',')}" elsewhere="${focus.elsewhere.join(',')}" always="${focus.alwaysShed ? 'shed' : 'kept'}"/>`,
        '',
      ]
    : [];

  // a path in the body is repo-relative, so two repos render the same text
  const asBodyPath = (filepath: string): string =>
    `.agent/repo=${input.slugRepo}/role=${input.slugRole}/${relative(input.roleDir, filepath)}`;

  // a modded resource names what the mod did to it; the path attr stays first
  const asModAttr = (filepath: string): string => {
    if (!mod) return '';
    return asRoleModAttr({
      plan: mod.plan,
      roleDir: input.roleDir,
      path: filepath,
    });
  };

  // the also section lists unclaimed resources in subject mode
  const hasAlso =
    bootPlan.also.briefs.length > 0 || bootPlan.also.skills.length > 0;
  const linesAlso = hasAlso
    ? [
        '<also>',
        ...bootPlan.also.briefs.map(
          (ref) =>
            `  <brief.ref path="${asBodyPath(ref.pathToOriginal)}"${asModAttr(ref.pathToOriginal)}/>`,
        ),
        ...bootPlan.also.skills.map(
          (filepath) =>
            `  <skill.ref path="${asBodyPath(filepath)}"${asModAttr(filepath)}/>`,
        ),
        '</also>',
        '',
      ]
    : [];

  // compose the body, in the order the prior per-line print used
  const lines: string[] = [
    ...linesMod,
    ...linesFocus,
    ...(readme
      ? [
          `<readme path="${asBodyPath(readme.path)}">`,
          readme.content,
          '</readme>',
          '',
        ]
      : []),
    ...briefsSaid.flatMap((said) => [
      `<brief.say path="${asBodyPath(said.path)}"${asModAttr(said.path)}>`,
      said.content,
      '</brief.say>',
      '',
    ]),
    ...bootPlan.briefs.ref.flatMap((ref) => [
      `<brief.ref path="${asBodyPath(ref.pathToOriginal)}"${asModAttr(ref.pathToOriginal)}/>`,
      '',
    ]),
    ...skillsSaid.flatMap((said) => [
      `<skill.say path="${asBodyPath(said.path)}"${asModAttr(said.path)}>`,
      said.content,
      '</skill.say>',
      '',
    ]),
    ...bootPlan.skills.ref.flatMap((filepath) => [
      `<skill.ref path="${asBodyPath(filepath)}"${asModAttr(filepath)}/>`,
      '',
    ]),
    ...linesAlso,
  ];

  // each line ends with a newline, as the prior per-line print did
  const body = lines.map((line) => `${line}\n`).join('');

  // count every file the plan touches, and every char said
  const files =
    (readme ? 1 : 0) +
    bootPlan.briefs.say.length +
    bootPlan.briefs.ref.length +
    bootPlan.skills.say.length +
    bootPlan.skills.ref.length +
    bootPlan.also.briefs.length +
    bootPlan.also.skills.length;
  const chars = computeSaidChars({
    saids: [...(readme ? [readme] : []), ...briefsSaid, ...skillsSaid],
  });

  return {
    body,
    stats: {
      roles: 1,
      files,
      briefsSay: bootPlan.briefs.say.length,
      briefsRef: bootPlan.briefs.ref.length,
      skillsSay: bootPlan.skills.say.length,
      skillsRef: bootPlan.skills.ref.length,
      chars,
    },
  };
};

/**
 * .what = the sum of the content lengths of the said resources
 * .why = the census counts only said content, since only that content spends tokens
 */
const computeSaidChars = (input: { saids: { content: string }[] }): number =>
  input.saids.reduce((sum, said) => sum + said.content.length, 0);
