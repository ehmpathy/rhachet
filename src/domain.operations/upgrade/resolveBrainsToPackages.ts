import { BadRequestError } from 'helpful-errors';

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
): Promise<string[]> => {
  // handle empty input
  if (input.specs.length === 0) return [];

  const packages: string[] = [];

  for (const spec of input.specs) {
    // wildcard: discover all brain packages
    if (spec === '*') {
      const brainPackages = await discoverBrainPackages(context);
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
  const installedBrains = await discoverBrainPackages(context);
  for (const pkg of unique) {
    if (!installedBrains.includes(pkg)) {
      throw new BadRequestError(`brain package not installed: ${pkg}`, {
        requested: pkg,
        installed: installedBrains,
        suggestion: `npm install ${pkg}`,
      });
    }
  }

  return unique;
};
