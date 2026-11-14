import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import {
  type RoleSupplierSlug,
  toRoleSupplierSlug,
} from '@src/domain.objects/RoleSupplierSlug';

/**
 * .what = expands role supplier specs against the installed packages and the linked roles
 * .why = the expansion is pure, so it is tested with no filesystem and no mocks; the
 *        orchestrator `expandRoleSupplierSlugs` reads the two inputs and hands them here
 *
 * .note = wildcard `*` expands to every installed role package and every linked role
 * .note = repo wildcard `$repo/*` (or a bare `$repo`) expands to the linked roles of that repo
 * .note = explicit `$repo/$role` returns as-is, linked or not, so its package still upgrades
 */
export const asRoleSupplierExpansion = (input: {
  specs: string[];
  packagesInstalled: string[];
  rolesLinked: RoleLinkRef[];
}): {
  packages: string[];
  linkedRoles: RoleLinkRef[];
  slugs: RoleSupplierSlug[];
} => {
  const packages = new Set<string>();
  const linkedRolesMap = new Map<string, RoleLinkRef>();
  const slugs = new Set<RoleSupplierSlug>();
  const addLinked = (role: RoleLinkRef): void => {
    linkedRolesMap.set(`${role.repo}/${role.role}`, role);
  };

  for (const spec of input.specs) {
    // global wildcard: every installed package, every linked role
    if (spec === '*') {
      for (const pkg of input.packagesInstalled) {
        packages.add(pkg);
        slugs.add(toRoleSupplierSlug(pkg));
      }
      input.rolesLinked.forEach(addLinked);
      continue;
    }

    // parse spec into repo/role parts; the package is always upgraded
    const parts = spec.split('/');
    const repo = parts[0]?.startsWith('rhachet-roles-')
      ? (parts[0] as string).replace('rhachet-roles-', '')
      : (parts[0] as string);
    const role = parts[1] ?? '*';
    packages.add(`rhachet-roles-${repo}`);

    // repo wildcard: every linked role of this repo
    if (role === '*') {
      slugs.add(`${repo}/*` as RoleSupplierSlug);
      input.rolesLinked.filter((r) => r.repo === repo).forEach(addLinked);
      continue;
    }

    // explicit role: the slug, plus its link where one exists
    slugs.add(`${repo}/${role}` as RoleSupplierSlug);
    input.rolesLinked
      .filter((r) => r.repo === repo && r.role === role)
      .forEach(addLinked);
  }

  return {
    packages: [...packages],
    linkedRoles: [...linkedRolesMap.values()],
    slugs: [...slugs],
  };
};
