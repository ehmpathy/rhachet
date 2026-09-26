import { ConstraintError } from 'helpful-errors';

import type { BootStats } from '@src/domain.operations/boot/BootStats';
import { getOneRoleBootContent } from '@src/domain.operations/boot/getOneRoleBootContent';

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = the `<stats>` block that heads and tails `roles boot` stdout
 * .why = a human who boots one role sees its size; the block stays out of `boot.md`
 */
const asBootStatsBlockLines = (input: { stats: BootStats }): string[] => {
  const { stats } = input;
  const tokens = Math.ceil(stats.chars / 4);
  const cost = (tokens / 1_000_000) * 3;
  const costText =
    cost < 0.01 ? `< $0.01` : `$${cost.toFixed(2).replace(/\.?0+$/, '')}`;
  const hasRefResources = stats.briefsRef > 0 || stats.skillsRef > 0;
  const countLines = hasRefResources
    ? [
        `  │   ├── briefs = ${stats.briefsSay + stats.briefsRef}`,
        `  │   │   ├── say = ${stats.briefsSay}`,
        `  │   │   └── ref = ${stats.briefsRef}`,
        `  │   └── skills = ${stats.skillsSay + stats.skillsRef}`,
        `  │       ├── say = ${stats.skillsSay}`,
        `  │       └── ref = ${stats.skillsRef}`,
      ]
    : [
        `  │   ├── briefs = ${stats.briefsSay}`,
        `  │   └── skills = ${stats.skillsSay}`,
      ];
  return [
    '<stats>',
    'quant',
    `  ├── files = ${stats.files}`,
    ...countLines,
    `  ├── chars = ${stats.chars}`,
    `  └── tokens ≈ ${tokens} (${costText} at $3/mil)`,
    '</stats>',
    '',
  ];
};

/**
 * .what = boots role resources (readme, briefs, skills) from a role directory
 * .why = outputs role resources with stats for context loading
 * .how = renders the role via getOneRoleBootContent, then prints stats, body, stats
 */
export const bootRoleResources = async ({
  slugRepo,
  slugRole,
  ifPresent,
  subjects,
  cwd = process.cwd(),
}: {
  slugRepo: string;
  slugRole: string;
  ifPresent: boolean;
  subjects?: string[];
  cwd?: string;
}): Promise<void> => {
  const isRepoThis = slugRepo === '.this';
  const roleDir = resolve(
    cwd,
    '.agent',
    `repo=${slugRepo}`,
    `role=${slugRole}`,
  );

  // an absent role dir exits silent under --if-present, else names the fix
  if (!existsSync(roleDir)) {
    if (ifPresent) return;
    const hint = isRepoThis
      ? `Create .agent/repo=.this/role=${slugRole}/[briefs,skills] directories`
      : `Run "rhachet roles link --repo ${slugRepo} --role ${slugRole}" first`;
    throw new ConstraintError(`role directory not found: ${roleDir}`, {
      roleDir,
      hint,
    });
  }

  // render the role through the one renderer
  const { body, stats } = await getOneRoleBootContent({
    slugRepo,
    slugRole,
    subjects: subjects ?? null,
    cwd,
  });

  // an empty role exits silent under --if-present, else warns
  if (stats.files === 0) {
    if (ifPresent) return;
    console.log(``);
    console.log(`⚠️  No resources found in ${roleDir}`);
    console.log(``);
    return;
  }

  // print stats, body, stats; the body's last newline is the print's own
  const statsLines = asBootStatsBlockLines({ stats });
  statsLines.forEach((line) => console.log(line));
  console.log(body.slice(0, -1));
  statsLines.forEach((line) => console.log(line));
};
