import { RoleSkillExecutable } from '@src/domain.objects/RoleSkillExecutable';

import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';

/**
 * .what = recursively finds all executable files in a directory
 * .why = skills can be nested in subdirectories (e.g., claude.hooks/)
 */
const getAllFilesFromDir = (dir: string): string[] => {
  // skip if directory does not exist
  if (!existsSync(dir)) return [];

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
 * .what = extracts skill slug from a filename
 * .why = skill files may have .sh extension or be extensionless
 */
const extractSlugFromFilename = (filename: string): string => {
  // remove .sh extension if present
  if (filename.endsWith('.sh')) return filename.slice(0, -3);
  return filename;
};

/**
 * .what = discovers executable skill files from linked role directories
 * .why = enables `rhachet run --skill` to find and execute skills
 */
export const discoverSkillExecutables = (input: {
  slugRepo?: string;
  slugRole?: string;
  slugSkill?: string;
}): RoleSkillExecutable[] => {
  const agentDir = resolve(process.cwd(), '.agent');

  // skip if .agent directory does not exist
  if (!existsSync(agentDir)) return [];

  // discover repo directories
  const repoEntries = readdirSync(agentDir).filter((entry) =>
    entry.startsWith('repo='),
  );

  const skills: RoleSkillExecutable[] = [];

  for (const repoEntry of repoEntries) {
    const slugRepo = repoEntry.replace('repo=', '');

    // filter by slugRepo if specified
    if (input.slugRepo && slugRepo !== input.slugRepo) continue;

    const repoDir = resolve(agentDir, repoEntry);

    // discover role directories
    const roleEntries = readdirSync(repoDir).filter((entry) =>
      entry.startsWith('role='),
    );

    for (const roleEntry of roleEntries) {
      const slugRole = roleEntry.replace('role=', '');

      // filter by slugRole if specified
      if (input.slugRole && slugRole !== input.slugRole) continue;

      const skillsDir = resolve(repoDir, roleEntry, 'skills');

      // get all files from skills directory
      const skillFiles = getAllFilesFromDir(skillsDir);

      for (const skillPath of skillFiles) {
        const filename = basename(skillPath);
        const slug = extractSlugFromFilename(filename);

        // filter by slugSkill if specified
        if (input.slugSkill && slug !== input.slugSkill) continue;

        skills.push(
          new RoleSkillExecutable({
            slug,
            path: skillPath,
            slugRepo,
            slugRole,
          }),
        );
      }
    }
  }

  return skills;
};
