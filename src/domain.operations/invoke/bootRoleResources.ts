import { BadRequestError } from 'helpful-errors';

import { computeBootPlan } from '@src/domain.operations/boot/computeBootPlan';
import { parseRoleBootYaml } from '@src/domain.operations/boot/parseRoleBootYaml';
import { assertZeroOrphanMinifiedBriefs } from '@src/domain.operations/role/briefs/assertZeroOrphanMinifiedBriefs';
import { getRoleBriefRefs } from '@src/domain.operations/role/briefs/getRoleBriefRefs';
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
  const bootYamlPath = resolve(roleDir, 'boot.yml');

  // blocklisted brief directories (work-in-progress and deprecated content)
  const blocklist = ['.scratch', '.archive'];

  const readmeFile = allFiles.find((f) => f === readmePath);
  const briefFilesRaw = allFiles
    .filter((f) => f.startsWith(briefsDir))
    .filter((f) => !blocklist.some((dir) => f.includes(`/${dir}/`)));

  // resolve .md.min preference and detect orphans
  const { refs: briefRefs, orphans } = getRoleBriefRefs({
    briefFiles: briefFilesRaw,
    briefsDir,
  });
  assertZeroOrphanMinifiedBriefs({ orphans });

  const skillFiles = allFiles.filter((f) => f.startsWith(skillsDir));

  // load and parse boot.yml if present
  const bootConfig = existsSync(bootYamlPath)
    ? parseRoleBootYaml({
        content: readFileSync(bootYamlPath, 'utf-8'),
        path: bootYamlPath,
      })
    : null;

  // validate: --subject requires subject mode
  if (subjects && subjects.length > 0) {
    if (!bootConfig || bootConfig.mode !== 'subject') {
      throw new BadRequestError('--subject requires boot.yml in subject mode', {
        subjects,
        mode: bootConfig?.mode ?? 'none',
      });
    }
  }

  // compute which resources to say vs ref
  // briefRefs carry pathToOriginal (for glob match) and pathToMinified (for content)
  const bootPlan = await computeBootPlan({
    config: bootConfig,
    briefRefs,
    skillPaths: skillFiles,
    cwd: roleDir,
    subjects,
  });

  // combine all relevant files (readme is always say)
  // for briefs, use pathToOriginal for file count (content path is resolved separately)
  const relevantFiles = [
    ...(readmeFile ? [readmeFile] : []),
    ...bootPlan.briefs.say.map((ref) => ref.pathToOriginal),
    ...bootPlan.briefs.ref.map((ref) => ref.pathToOriginal),
    ...bootPlan.skills.say,
    ...bootPlan.skills.ref,
    ...bootPlan.also.briefs.map((ref) => ref.pathToOriginal),
    ...bootPlan.also.skills,
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

  // calculate stats (only count chars for "say" resources, which consume tokens)
  let totalChars = 0;

  // count readme if present
  if (readmeFile) {
    const content = readFileSync(readmeFile, 'utf-8');
    totalChars += content.length;
  }

  // count say briefs (use .md.min content when available)
  for (const ref of bootPlan.briefs.say) {
    const contentPath = ref.pathToMinified ?? ref.pathToOriginal;
    const content = readFileSync(contentPath, 'utf-8');
    totalChars += content.length;
  }

  // count say skills
  for (const filepath of bootPlan.skills.say) {
    const doc = extractSkillDocumentation(filepath);
    totalChars += doc.length;
  }

  const approxTokens = Math.ceil(totalChars / 4);
  const costPerMillionTokens = 3;
  const approxCost = (approxTokens / 1_000_000) * costPerMillionTokens;
  const costFormatted =
    approxCost < 0.01
      ? `< $0.01`
      : `$${approxCost.toFixed(2).replace(/\.?0+$/, '')}`;

  // compute counts for stats
  const briefsSayCount = bootPlan.briefs.say.length;
  const briefsRefCount = bootPlan.briefs.ref.length;
  const skillsSayCount = bootPlan.skills.say.length;
  const skillsRefCount = bootPlan.skills.ref.length;
  const hasRefResources = briefsRefCount > 0 || skillsRefCount > 0;

  // print stats helper
  const printStats = (): void => {
    console.log('<stats>');
    console.log('quant');
    console.log(`  ├── files = ${relevantFiles.length}`);

    // show say/ref breakdown if any resources are ref'd
    if (hasRefResources) {
      console.log(`  │   ├── briefs = ${briefsSayCount + briefsRefCount}`);
      console.log(`  │   │   ├── say = ${briefsSayCount}`);
      console.log(`  │   │   └── ref = ${briefsRefCount}`);
      console.log(`  │   └── skills = ${skillsSayCount + skillsRefCount}`);
      console.log(`  │       ├── say = ${skillsSayCount}`);
      console.log(`  │       └── ref = ${skillsRefCount}`);
    } else {
      console.log(`  │   ├── briefs = ${briefsSayCount}`);
      console.log(`  │   └── skills = ${skillsSayCount}`);
    }

    console.log(`  ├── chars = ${totalChars}`);
    console.log(`  └── tokens ≈ ${approxTokens} (${costFormatted} at $3/mil)`);
    console.log('</stats>');
    console.log('');
  };

  // print stats header
  printStats();

  // helper to get relative path for output
  const getRelativePath = (filepath: string): string =>
    `.agent/repo=${slugRepo}/role=${slugRole}/${relative(roleDir, filepath)}`;

  // print readme (always say with full content)
  if (readmeFile) {
    const relativePath = getRelativePath(readmeFile);
    console.log(`<readme path="${relativePath}">`);
    console.log(readFileSync(readmeFile, 'utf-8'));
    console.log('</readme>');
    console.log('');
  }

  // print say briefs (full content, use .md.min when available)
  for (const ref of bootPlan.briefs.say) {
    const contentPath = ref.pathToMinified ?? ref.pathToOriginal;
    const relativePath = getRelativePath(contentPath);
    console.log(`<brief.say path="${relativePath}">`);
    console.log(readFileSync(contentPath, 'utf-8'));
    console.log('</brief.say>');
    console.log('');
  }

  // print ref briefs (path only)
  for (const ref of bootPlan.briefs.ref) {
    const relativePath = getRelativePath(ref.pathToOriginal);
    console.log(`<brief.ref path="${relativePath}"/>`);
    console.log('');
  }

  // print say skills (full content)
  for (const filepath of bootPlan.skills.say) {
    const relativePath = getRelativePath(filepath);
    console.log(`<skill.say path="${relativePath}">`);
    console.log(extractSkillDocumentation(filepath));
    console.log('</skill.say>');
    console.log('');
  }

  // print ref skills (path only)
  for (const filepath of bootPlan.skills.ref) {
    const relativePath = getRelativePath(filepath);
    console.log(`<skill.ref path="${relativePath}"/>`);
    console.log('');
  }

  // print also section (unclaimed resources in subject mode)
  const hasAlsoResources =
    bootPlan.also.briefs.length > 0 || bootPlan.also.skills.length > 0;
  if (hasAlsoResources) {
    console.log('<also>');
    for (const ref of bootPlan.also.briefs) {
      const relativePath = getRelativePath(ref.pathToOriginal);
      console.log(`  <brief.ref path="${relativePath}"/>`);
    }
    for (const filepath of bootPlan.also.skills) {
      const relativePath = getRelativePath(filepath);
      console.log(`  <skill.ref path="${relativePath}"/>`);
    }
    console.log('</also>');
    console.log('');
  }

  // print stats footer
  printStats();
};
