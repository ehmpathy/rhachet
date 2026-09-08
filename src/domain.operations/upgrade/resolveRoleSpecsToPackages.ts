import { ConstraintError } from 'helpful-errors';

import type { ContextCli } from '@src/domain.objects/ContextCli';
import { discoverRolePackages } from '@src/domain.operations/init/roles/packages/discoverRolePackages';

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
  options?: {
    /**
     * .what = the package discovery this operation composes
     * .why = the same seam, for the same reason as `resolveBrainsToPackages`: a real
     *   discovery reads `package.json` off disk, and a unit row must not cross that
     *   boundary nor mock the module (`rule.forbid.unit.remote-boundaries`)
     */
    discover?: typeof discoverRolePackages;
  },
): Promise<string[]> => {
  const discover = options?.discover ?? discoverRolePackages;

  // handle empty input
  if (input.specs.length === 0) return [];

  const packages: string[] = [];

  for (const spec of input.specs) {
    // wildcard: discover all role packages
    if (spec === '*') {
      const rolePackages = await discover(context);
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
  //
  // ⚠️ `ConstraintError` — a `--roles` spec that names an uninstalled package is the
  //   CALLER's to amend, so it owes exit 2 (`rule.require.exit-code-semantics`)
  //
  // ⚠️ the hint names NO package-manager command: this row fires on every host, and the
  //   repo may be on npm, pnpm, yarn, or bun. the datum the caller needs is already in
  //   `installed`, so the hint points at it (`rule.forbid.host-specific-cures-in-hints`)
  const installedRoles = await discover(context);
  for (const pkg of unique) {
    if (!installedRoles.includes(pkg)) {
      throw new ConstraintError(`role package not installed: ${pkg}`, {
        requested: pkg,
        installed: installedRoles,
        hint: `add "${pkg}" to this repo's dependencies and re-install, or pass one of the roles named in \`installed\``,
      });
    }
  }

  return unique;
};
