import type { RoleManifest } from '@src/domain.objects/RoleManifest';
import type { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';
import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';

import { getRoleFromManifests } from './getRoleFromManifests';

/**
 * .what = gets roles from manifests by specifiers
 * .why = enables batch link/init operations
 *
 * .note = fail-fast on first error (not found, ambiguous)
 */
export const getRolesFromManifests = (input: {
  specifiers: RoleSpecifier[];
  manifests: RoleRegistryManifest[];
}): {
  specifier: RoleSpecifier;
  repo: RoleRegistryManifest;
  role: RoleManifest;
}[] => {
  return input.specifiers.map((specifier) => ({
    specifier,
    ...getRoleFromManifests({ specifier, manifests: input.manifests }),
  }));
};
