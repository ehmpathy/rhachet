import { getGitRepoRoot } from 'rhachet-artifact-git';

import { extractSkillDocumentation } from '@src/domain.operations/role/extractSkillDocumentation';

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

/**
 * .what = recursively reads all files from a directory, following symlinks
 */
const getAllFilesFromDir = (dir: string): string[] => {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = resolve(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...getAllFilesFromDir(fullPath));
    } else if (stats.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
};

/**
 * .what = boots role resources (readme, briefs, skills) from a role directory
 * .why = outputs role resources with stats for context loading
 * .how = reads files from .agent/repo=$repo/role=$role and prints them with formatting
 */
export const bootRoleResources = async ({
  repoSlug,
  roleSlug,
}: {
  repoSlug: string;
  roleSlug: string;
}): Promise<void> => {
  const gitRoot = await getGitRepoRoot({ from: process.cwd() });
  const isRepoThis = repoSlug === '.this';

  const roleDir = resolve(
    process.cwd(),
    '.agent',
    `repo=${repoSlug}`,
    `role=${roleSlug}`,
  );

  // check if role directory exists
  if (!existsSync(roleDir)) {
    const hint = isRepoThis
      ? `Create .agent/repo=.this/role=${roleSlug}/[briefs,skills] directories`
      : `Run "rhachet roles link --repo ${repoSlug} --role ${roleSlug}" first`;
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
    console.log('#####################################################');
    console.log('#####################################################');
    console.log('#####################################################');
    console.log('## began:stats');
    console.log('#####################################################');
    console.log('');
    console.log('  quant');
    console.log(`    ├── files = ${relevantFiles.length}`);
    console.log(`    │   ├── briefs = ${briefFiles.length}`);
    console.log(`    │   └── skills = ${skillFiles.length}`);
    console.log(`    ├── chars = ${totalChars}`);
    console.log(
      `    └── tokens ≈ ${approxTokens} (${costFormatted} at $3/mil)`,
    );
    console.log('');
    console.log('  treestruct');
    const treeOutput = execSync(`tree -l ${roleDir}`, {
      encoding: 'utf-8',
    })
      .split('\n')
      .map((line) => line.replace(/ -> .*$/, ''))
      .map((line) => line.replace(gitRoot, '@gitroot'))
      .filter((line) => !line.match(/^\s*\d+\s+director(y|ies),/))
      .filter((line) => line.trim() !== '')
      .map((line) => `    ${line}`)
      .join('\n');
    console.log(treeOutput);
    console.log('');
    console.log('  quant');
    console.log(`    ├── files = ${relevantFiles.length}`);
    console.log(`    │   ├── briefs = ${briefFiles.length}`);
    console.log(`    │   └── skills = ${skillFiles.length}`);
    console.log(`    ├── chars = ${totalChars}`);
    console.log(
      `    └── tokens ≈ ${approxTokens} (${costFormatted} at $3/mil)`,
    );
    console.log('');
    console.log('#####################################################');
    console.log('## ended:stats');
    console.log('#####################################################');
    console.log('#####################################################');
    console.log('#####################################################');
    console.log('');
  };

  // print stats header
  printStats();

  // print each file
  for (const filepath of relevantFiles) {
    const relativePath = `.agent/repo=${repoSlug}/role=${roleSlug}/${relative(roleDir, filepath)}`;
    const isSkill = filepath.startsWith(skillsDir);

    console.log('#####################################################');
    console.log('#####################################################');
    console.log('#####################################################');
    console.log(`## began:${relativePath}`);
    console.log('#####################################################');
    console.log('');

    const content = isSkill
      ? extractSkillDocumentation(filepath)
      : readFileSync(filepath, 'utf-8');

    const indentedContent = content
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n');
    console.log(indentedContent);

    console.log('');
    console.log('#####################################################');
    console.log(`## ended:${relativePath}`);
    console.log('#####################################################');
    console.log('#####################################################');
    console.log('#####################################################');
    console.log('');
  }

  // print stats footer
  printStats();
};
