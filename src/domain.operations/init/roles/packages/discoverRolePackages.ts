import { getGitRepoRoot } from 'rhachet-artifact-git';

import type { ContextCli } from '@src/domain.objects/ContextCli';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = discovers rhachet role packages from package.json
 * .why = enables auto-initialization of rhachet.use.ts config
 * .how = scans dependencies + devDependencies for packages that match `rhachet-roles-*`
 */
export const discoverRolePackages = async (
  context: ContextCli,
): Promise<string[]> => {
  const root = await getGitRepoRoot({ from: context.cwd });
  const pkgPath = resolve(root, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  return Object.keys(allDeps).filter((name) =>
    name.startsWith('rhachet-roles-'),
  );
};
