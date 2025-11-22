import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getGitRepoRoot } from 'rhachet-artifact-git';

/**
 * .what = discovers rhachet role packages from package.json
 * .why = enables auto-initialization of rhachet.use.ts config
 * .how = scans dependencies + devDependencies for packages matching `rhachet-roles-*`
 */
export const discoverRolePackages = async (input: {
  from: string;
}): Promise<string[]> => {
  const root = await getGitRepoRoot({ from: input.from });
  const pkgPath = resolve(root, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  return Object.keys(allDeps).filter((name) =>
    name.startsWith('rhachet-roles-'),
  );
};
