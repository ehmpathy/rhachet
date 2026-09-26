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
}): { body: string; stats: BootStats } => {
  const { bootPlan, readme, briefsSaid, skillsSaid } = input;

  // a path in the body is repo-relative, so two repos render the same text
  const asBodyPath = (filepath: string): string =>
    `.agent/repo=${input.slugRepo}/role=${input.slugRole}/${relative(input.roleDir, filepath)}`;

  // the also section lists unclaimed resources in subject mode
  const hasAlso =
    bootPlan.also.briefs.length > 0 || bootPlan.also.skills.length > 0;
  const linesAlso = hasAlso
    ? [
        '<also>',
        ...bootPlan.also.briefs.map(
          (ref) => `  <brief.ref path="${asBodyPath(ref.pathToOriginal)}"/>`,
        ),
        ...bootPlan.also.skills.map(
          (filepath) => `  <skill.ref path="${asBodyPath(filepath)}"/>`,
        ),
        '</also>',
        '',
      ]
    : [];

  // compose the body, in the order the prior per-line print used
  const lines: string[] = [
    ...(readme
      ? [
          `<readme path="${asBodyPath(readme.path)}">`,
          readme.content,
          '</readme>',
          '',
        ]
      : []),
    ...briefsSaid.flatMap((said) => [
      `<brief.say path="${asBodyPath(said.path)}">`,
      said.content,
      '</brief.say>',
      '',
    ]),
    ...bootPlan.briefs.ref.flatMap((ref) => [
      `<brief.ref path="${asBodyPath(ref.pathToOriginal)}"/>`,
      '',
    ]),
    ...skillsSaid.flatMap((said) => [
      `<skill.say path="${asBodyPath(said.path)}">`,
      said.content,
      '</skill.say>',
      '',
    ]),
    ...bootPlan.skills.ref.flatMap((filepath) => [
      `<skill.ref path="${asBodyPath(filepath)}"/>`,
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
