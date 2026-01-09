import { RoleInitExecutable } from '@src/domain.objects/RoleInitExecutable';
import { getAllFilesFromDir } from '@src/infra/filesystem/getAllFilesFromDir';

import { existsSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

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
  slugRepo?: string;
  slugRole?: string;
  slugInit?: string;
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

      const initsDir = resolve(repoDir, roleEntry, 'inits');

      // get all files from inits directory
      const initFiles = getAllFilesFromDir(initsDir);

      for (const initPath of initFiles) {
        const slug = extractSlugFromPath({ initsDir, filePath: initPath });

        // filter by slugInit if specified
        if (input.slugInit && slug !== input.slugInit) continue;

        inits.push(
          new RoleInitExecutable({
            slug,
            path: initPath,
            slugRepo,
            slugRole,
          }),
        );
      }
    }
  }

  return inits;
};
