import { extractSkillDocumentation } from '@src/domain.operations/role/extractSkillDocumentation';
import { getAllFilesFromDir } from '@src/infra/filesystem/getAllFilesFromDir';

import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

/**
 * .what = boots role resources (readme, briefs, skills) from a role directory
 * .why = outputs role resources with stats for context loading
 * .how = reads files from .agent/repo=$repo/role=$role and prints them with formatting
 */
export const bootRoleResources = async ({
  slugRepo,
  slugRole,
  ifPresent,
}: {
  slugRepo: string;
  slugRole: string;
  ifPresent: boolean;
}): Promise<void> => {
  const isRepoThis = slugRepo === '.this';

  const roleDir = resolve(
    process.cwd(),
    '.agent',
    `repo=${slugRepo}`,
    `role=${slugRole}`,
  );

  // check if role directory exists
  if (!existsSync(roleDir)) {
    // if --if-present, exit silently without error
    if (ifPresent) return;

    const hint = isRepoThis
      ? `Create .agent/repo=.this/role=${slugRole}/[briefs,skills] directories`
      : `Run "rhachet roles link --repo ${slugRepo} --role ${slugRole}" first`;
    throw new Error(`Role directory not found: ${roleDir}\n${hint}`);
  }

  // recursively read all files, then filter to readme, briefs, and skills
  const allFiles = getAllFilesFromDir(roleDir).sort();
  const briefsDir = resolve(roleDir, 'briefs');
  const skillsDir = resolve(roleDir, 'skills');
  const readmePath = resolve(roleDir, 'readme.md');

  const readmeFile = allFiles.find((f) => f === readmePath);
  const briefFiles = allFiles.filter((f) => f.startsWith(briefsDir));
  const skillFiles = allFiles.filter((f) => f.startsWith(skillsDir));
  const relevantFiles = [
    ...(readmeFile ? [readmeFile] : []),
    ...briefFiles,
    ...skillFiles,
  ];

  // handle empty case
  if (relevantFiles.length === 0) {
    // if --if-present, exit silently without warning
    if (ifPresent) return;

    console.log(``);
    console.log(`⚠️  No resources found in ${roleDir}`);
    console.log(``);
    return;
  }

  // calculate stats
  let totalChars = 0;
  for (const filepath of relevantFiles) {
    const isSkill = filepath.startsWith(skillsDir);
    if (isSkill) {
      const doc = extractSkillDocumentation(filepath);
      totalChars += doc.length;
    } else {
      const content = readFileSync(filepath, 'utf-8');
      totalChars += content.length;
    }
  }

  const approxTokens = Math.ceil(totalChars / 4);
  const costPerMillionTokens = 3;
  const approxCost = (approxTokens / 1_000_000) * costPerMillionTokens;
  const costFormatted =
    approxCost < 0.01
      ? `< $0.01`
      : `$${approxCost.toFixed(2).replace(/\.?0+$/, '')}`;

  // print stats helper
  const printStats = (): void => {
    console.log('<stats>');
    console.log('quant');
    console.log(`  ├── files = ${relevantFiles.length}`);
    console.log(`  │   ├── briefs = ${briefFiles.length}`);
    console.log(`  │   └── skills = ${skillFiles.length}`);
    console.log(`  ├── chars = ${totalChars}`);
    console.log(`  └── tokens ≈ ${approxTokens} (${costFormatted} at $3/mil)`);
    console.log('</stats>');
    console.log('');
  };

  // print stats header
  printStats();

  // print each file
  for (const filepath of relevantFiles) {
    const relativePath = `.agent/repo=${slugRepo}/role=${slugRole}/${relative(roleDir, filepath)}`;
    const isSkill = filepath.startsWith(skillsDir);
    const isReadme = filepath === readmePath;
    const tagName = isSkill ? 'skill' : isReadme ? 'readme' : 'brief';

    console.log(`<${tagName} path="${relativePath}">`);

    const content = isSkill
      ? extractSkillDocumentation(filepath)
      : readFileSync(filepath, 'utf-8');

    console.log(content);
    console.log(`</${tagName}>`);
    console.log('');
  }

  // print stats footer
  printStats();
};
