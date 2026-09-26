import type { ContextCli } from '@src/domain.objects/ContextCli';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = discovers rhachet role packages from package.json
 * .why = enables auto-initialization of rhachet.use.ts config
 * .how = scans dependencies + devDependencies for packages that match `rhachet-roles-*`
 *
 * .note = reads the root the context already resolved, so no second git lookup runs
 */
export const discoverRolePackages = async (
  context: ContextCli,
): Promise<string[]> => {
  const pkgPath = resolve(context.gitroot, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  return Object.keys(allDeps).filter((name) =>
    name.startsWith('rhachet-roles-'),
  );
};
