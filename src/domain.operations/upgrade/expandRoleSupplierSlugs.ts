import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import type { RoleSupplierSlug } from '@src/domain.objects/RoleSupplierSlug';
import { discoverRolePackages } from '@src/domain.operations/init/roles/packages/discoverRolePackages';
import { discoverLinkedRoles } from '@src/domain.operations/role/discoverLinkedRoles';

import { asRoleSupplierExpansion } from './asRoleSupplierExpansion';

/**
 * .what = expands role supplier slugs to concrete RoleLinkRefs
 * .why = enables `--roles ehmpathy/*` and `--roles ehmpathy/mechanic` to expand
 *
 * .note = the installed packages are read only when a spec is the global wildcard `*`
 */
export const expandRoleSupplierSlugs = async (
  input: { specs: string[] },
  context: ContextCli,
): Promise<{
  packages: string[];
  linkedRoles: RoleLinkRef[];
  slugs: RoleSupplierSlug[];
}> => {
  // handle empty input
  if (input.specs.length === 0)
    return { packages: [], linkedRoles: [], slugs: [] };

  // read what the expansion is computed against
  const rolesLinked = discoverLinkedRoles({}, context);
  const packagesInstalled = input.specs.includes('*')
    ? await discoverRolePackages(context)
    : [];

  // expand
  return asRoleSupplierExpansion({
    specs: input.specs,
    packagesInstalled,
    rolesLinked,
  });
};
