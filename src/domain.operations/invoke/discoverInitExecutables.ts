import { RoleInitExecutable } from '@src/domain.objects/RoleInitExecutable';

import { existsSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

/**
 * .what = recursively finds all executable files in a directory
 * .why = inits can be nested in subdirectories (e.g., claude.hooks/)
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
 * .what = extracts init slug from relative path
 * .why = init slug must include subdirectory path (e.g., "claude.hooks/sessionstart.notify-permissions")
 */
const extractSlugFromPath = (input: {
  initsDir: string;
  filePath: string;
}): string => {
  // get path relative to inits directory
  const relativePath = relative(input.initsDir, input.filePath);

  // remove .sh extension if present
  if (relativePath.endsWith('.sh')) return relativePath.slice(0, -3);
  return relativePath;
};

/**
 * .what = discovers executable init files from linked role directories
 * .why = enables `rhachet roles init --command` to find and execute inits
 */
export const discoverInitExecutables = (input: {
  repoSlug?: string;
  roleSlug?: string;
  initSlug?: string;
}): RoleInitExecutable[] => {
  const agentDir = resolve(process.cwd(), '.agent');

  // skip if .agent directory does not exist
  if (!existsSync(agentDir)) return [];

  // discover repo directories
  const repoEntries = readdirSync(agentDir).filter((entry) =>
    entry.startsWith('repo='),
  );

  const inits: RoleInitExecutable[] = [];

  for (const repoEntry of repoEntries) {
    const repoSlug = repoEntry.replace('repo=', '');

    // filter by repoSlug if specified
    if (input.repoSlug && repoSlug !== input.repoSlug) continue;

    const repoDir = resolve(agentDir, repoEntry);

    // discover role directories
    const roleEntries = readdirSync(repoDir).filter((entry) =>
      entry.startsWith('role='),
    );

    for (const roleEntry of roleEntries) {
      const roleSlug = roleEntry.replace('role=', '');

      // filter by roleSlug if specified
      if (input.roleSlug && roleSlug !== input.roleSlug) continue;

      const initsDir = resolve(repoDir, roleEntry, 'inits');

      // get all files from inits directory
      const initFiles = getAllFilesFromDir(initsDir);

      for (const initPath of initFiles) {
        const slug = extractSlugFromPath({ initsDir, filePath: initPath });

        // filter by initSlug if specified
        if (input.initSlug && slug !== input.initSlug) continue;

        inits.push(
          new RoleInitExecutable({
            slug,
            path: initPath,
            repoSlug,
            roleSlug,
          }),
        );
      }
    }
  }

  return inits;
};
