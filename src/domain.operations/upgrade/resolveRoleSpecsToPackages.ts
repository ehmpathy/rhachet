import { BadRequestError } from 'helpful-errors';

import type { ContextCli } from '@src/domain.objects/ContextCli';
import { discoverRolePackages } from '@src/domain.operations/init/discoverRolePackages';

/**
 * .what = converts role specs to npm package names
 * .why = enables `--roles ehmpathy` → `rhachet-roles-ehmpathy`
 *
 * .note = validates role packages exist in package.json
 * .note = wildcard (*) expands via discoverRolePackages
 */
export const resolveRoleSpecsToPackages = async (
  input: { specs: string[] },
  context: ContextCli,
): Promise<string[]> => {
  // handle empty input
  if (input.specs.length === 0) return [];

  const packages: string[] = [];

  for (const spec of input.specs) {
    // wildcard: discover all role packages
    if (spec === '*') {
      const rolePackages = await discoverRolePackages(context);
      packages.push(...rolePackages);
      continue;
    }

    // explicit role: extract repo slug and construct package name
    // spec can be: "ehmpathy", "ehmpathy/mechanic", or "rhachet-roles-ehmpathy"
    const repoSlug = spec.startsWith('rhachet-roles-')
      ? spec.replace('rhachet-roles-', '').split('/')[0]
      : spec.split('/')[0];
    const packageName = `rhachet-roles-${repoSlug}`;
    packages.push(packageName);
  }

  // deduplicate
  const unique = [...new Set(packages)];

  // validate packages exist in package.json
  const installedRoles = await discoverRolePackages(context);
  for (const pkg of unique) {
    if (!installedRoles.includes(pkg)) {
      throw new BadRequestError(`role package not installed: ${pkg}`, {
        requested: pkg,
        installed: installedRoles,
        suggestion: `npm install ${pkg}`,
      });
    }
  }

  return unique;
};
