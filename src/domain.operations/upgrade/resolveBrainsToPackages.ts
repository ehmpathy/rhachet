import { ConstraintError } from 'helpful-errors';

import type { ContextCli } from '@src/domain.objects/ContextCli';
import { discoverBrainPackages } from '@src/domain.operations/brains/discoverBrainPackages';

/**
 * .what = converts brain specs to npm package names
 * .why = enables `--brains anthropic` → `rhachet-brains-anthropic`
 *
 * .note = validates brain packages exist in package.json
 * .note = wildcard (*) expands via discoverBrainPackages
 */
export const resolveBrainsToPackages = async (
  input: { specs: string[] },
  context: ContextCli,
  options?: {
    /**
     * .what = the package discovery this operation composes
     * .why = a REAL discovery reads `package.json` off disk, so a unit row that drives it
     *   must either cross that boundary or `jest.mock` the module — and the second is the
     *   mock antipattern (`rule.forbid.unit.remote-boundaries`). the seam lets the spec→
     *   package logic be proven with a typed fake, while the real read runs at the
     *   integration tier.
     *
     * .note = the DEFAULT is the only value production uses, as with `getPnpmPresence`'s
     *   `probe` and `execNpmInstall`'s `spawn`
     */
    discover?: typeof discoverBrainPackages;
  },
): Promise<string[]> => {
  const discover = options?.discover ?? discoverBrainPackages;

  // handle empty input
  if (input.specs.length === 0) return [];

  const packages: string[] = [];

  for (const spec of input.specs) {
    // wildcard: discover all brain packages
    if (spec === '*') {
      const brainPackages = await discover(context);
      packages.push(...brainPackages);
      continue;
    }

    // explicit brain: construct package name
    const packageName = spec.startsWith('rhachet-brains-')
      ? spec
      : `rhachet-brains-${spec}`;
    packages.push(packageName);
  }

  // deduplicate
  const unique = [...new Set(packages)];

  // validate packages exist in package.json
  //
  // ⚠️ `ConstraintError` — a `--brains` spec that names an uninstalled package is the
  //   CALLER's to amend, so it owes exit 2 (`rule.require.exit-code-semantics`)
  //
  // ⚠️ the hint names NO package-manager command: this row fires on every host, and the
  //   repo may be on npm, pnpm, yarn, or bun. the datum the caller needs is already in
  //   `installed`, so the hint points at it (`rule.forbid.host-specific-cures-in-hints`)
  const installedBrains = await discover(context);
  for (const pkg of unique) {
    if (!installedBrains.includes(pkg)) {
      throw new ConstraintError(`brain package not installed: ${pkg}`, {
        requested: pkg,
        installed: installedBrains,
        hint: `add "${pkg}" to this repo's dependencies and re-install, or pass one of the brains named in \`installed\``,
      });
    }
  }

  return unique;
};
