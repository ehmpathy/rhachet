import type { ContextCli } from '@src/domain.objects/ContextCli';
import {
  type RoleSupplierSlug,
  toRoleSupplierSlug,
} from '@src/domain.objects/RoleSupplierSlug';
import { discoverRolePackages } from '@src/domain.operations/init/discoverRolePackages';

import { discoverLinkedRoles, type RoleLinkRef } from './discoverLinkedRoles';

/**
 * .what = expands role supplier slugs to concrete RoleLinkRefs
 * .why = enables `--roles ehmpathy/*` and `--roles ehmpathy/mechanic` to resolve
 *
 * .note = wildcard `*` expands to all installed role packages
 * .note = repo wildcard `$repo/*` expands to all linked roles in that repo
 * .note = explicit `$repo/$role` returns as-is (may not be linked)
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
  if (input.specs.length === 0) {
    return { packages: [], linkedRoles: [], slugs: [] };
  }

  const packages = new Set<string>();
  const linkedRolesMap = new Map<string, RoleLinkRef>();
  const slugs = new Set<RoleSupplierSlug>();

  // discover all linked roles upfront (needed for wildcards)
  const allLinkedRoles = discoverLinkedRoles({}, context);

  for (const spec of input.specs) {
    // global wildcard: discover all installed role packages
    if (spec === '*') {
      const installedPackages = await discoverRolePackages(context);
      for (const pkg of installedPackages) {
        packages.add(pkg);
        slugs.add(toRoleSupplierSlug(pkg));
      }

      // add all linked roles
      for (const role of allLinkedRoles) {
        const key = `${role.repo}/${role.role}`;
        linkedRolesMap.set(key, role);
      }
      continue;
    }

    // parse spec into repo/role parts
    const parts = spec.split('/');
    const repo = parts[0]?.startsWith('rhachet-roles-')
      ? (parts[0] as string).replace('rhachet-roles-', '')
      : (parts[0] as string);
    const role = parts[1] ?? '*';
    const packageName = `rhachet-roles-${repo}`;

    // add package (always upgrade the package)
    packages.add(packageName);

    // repo wildcard: add all linked roles for this repo
    if (role === '*') {
      slugs.add(`${repo}/*` as RoleSupplierSlug);
      const rolesInRepo = allLinkedRoles.filter((r) => r.repo === repo);
      for (const r of rolesInRepo) {
        const key = `${r.repo}/${r.role}`;
        linkedRolesMap.set(key, r);
      }
    } else {
      // explicit role: add slug, check if linked
      slugs.add(`${repo}/${role}` as RoleSupplierSlug);
      const linkedRole = allLinkedRoles.find(
        (r) => r.repo === repo && r.role === role,
      );
      if (linkedRole) {
        const key = `${linkedRole.repo}/${linkedRole.role}`;
        linkedRolesMap.set(key, linkedRole);
      }
    }
  }

  return {
    packages: [...packages],
    linkedRoles: [...linkedRolesMap.values()],
    slugs: [...slugs],
  };
};
