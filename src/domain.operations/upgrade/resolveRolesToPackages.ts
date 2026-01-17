import { BadRequestError } from 'helpful-errors';

import type { ContextCli } from '@src/domain.objects/ContextCli';

import { getRoleRegistriesByConfigImplicit } from '../config/getRoleRegistriesByConfigImplicit';
import type { RoleLinkRef } from './discoverLinkedRoles';

/**
 * .what = resolves role refs to npm package names
 * .why = enables npm install of the correct packages for role upgrade
 *
 * .note = validates roles exist in installed packages before return
 * .note = deduplicates packages (multiple roles from same repo → one package)
 */
export const resolveRolesToPackages = async (
  input: { roles: RoleLinkRef[] },
  context: ContextCli,
): Promise<string[]> => {
  // handle empty input
  if (input.roles.length === 0) return [];

  // discover installed manifests
  const { manifests } = await getRoleRegistriesByConfigImplicit(context);

  // resolve each role to its package
  const packages = new Set<string>();

  for (const roleRef of input.roles) {
    // find manifest by repo slug
    const manifest = manifests.find(
      (manifest) => manifest.slug === roleRef.repo,
    );
    if (!manifest) {
      throw new BadRequestError(
        `role package not installed: ${roleRef.repo}/${roleRef.role}`,
        {
          suggestion: `npm install rhachet-roles-${roleRef.repo}`,
        },
      );
    }

    // package name = rhachet-roles-{slug}
    packages.add(`rhachet-roles-${manifest.slug}`);
  }

  return [...packages];
};
