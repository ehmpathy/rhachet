import type { ContextCli } from '@src/domain.objects/ContextCli';

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = discovers rhachet role packages from package.json
 * .why = enables auto-initialization of rhachet.use.ts config
 * .how = scans dependencies + devDependencies for packages that match `rhachet-roles-*`
 *
 * .note = reads the root the context already resolved, so no second git lookup runs
 * .note = a repo with no package.json declares no packages, so it discovers none
 */
export const discoverRolePackages = async (
  context: ContextCli,
): Promise<string[]> => {
  // a repo with no package.json declares no role packages
  const pkgPath = resolve(context.gitroot, 'package.json');
  if (!existsSync(pkgPath)) return [];

  // collect the rhachet-roles-* names across both dependency maps
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  return Object.keys(allDeps).filter((name) =>
    name.startsWith('rhachet-roles-'),
  );
};
