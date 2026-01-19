import type { ContextCli } from '@src/domain.objects/ContextCli';

import { resolve } from 'node:path';

/**
 * .what = checks if a resolved path is within the git repo root
 * .why = to avoid readonly for the repo's own directories when self-referenced
 */
export const isPathWithinGitroot = (
  input: { path: string },
  context: ContextCli,
): boolean => {
  const normalizedPath = resolve(input.path);
  const normalizedGitroot = resolve(context.gitroot);

  // check if path starts with gitroot (is inside the repo)
  return (
    normalizedPath.startsWith(normalizedGitroot + '/') ||
    normalizedPath === normalizedGitroot
  );
};
