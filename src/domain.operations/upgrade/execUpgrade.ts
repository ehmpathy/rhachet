import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';
import { initRolesFromPackages } from '@src/domain.operations/init/initRolesFromPackages';

import { discoverLinkedRoles, type RoleLinkRef } from './discoverLinkedRoles';
import { execNpmInstall } from './execNpmInstall';
import { resolveRolesToPackages } from './resolveRolesToPackages';

/**
 * .what = result of upgrade operation
 * .why = provides structured summary of what was upgraded
 */
export interface UpgradeResult {
  upgradedSelf: boolean;
  upgradedRoles: RoleLinkRef[];
}

/**
 * .what = expands role specs to concrete role refs
 * .why = handles wildcard (*) expansion via linked role discovery
 */
const expandRoleSpecs = (
  input: { specs: string[] },
  context: ContextCli,
): RoleLinkRef[] => {
  const roles: RoleLinkRef[] = [];

  for (const spec of input.specs) {
    // wildcard: discover all linked roles
    if (spec === '*') {
      const linkedRoles = discoverLinkedRoles({}, context);
      roles.push(...linkedRoles);
      continue;
    }

    // explicit role: parse repo/role format
    const parts = spec.split('/');
    const repo = parts[0] ?? spec;
    const role = parts[1] ?? spec;
    roles.push({ repo, role });
  }

  // deduplicate by repo+role
  const seen = new Set<string>();
  return roles.filter((r) => {
    const key = `${r.repo}/${r.role}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * .what = builds list of packages to install at @latest
 * .why = combines self (rhachet) with role packages for npm install
 */
const buildInstallList = (input: {
  self: boolean;
  packages: string[];
}): string[] => {
  const list: string[] = [];

  // add rhachet if self upgrade requested
  if (input.self) {
    list.push('rhachet');
  }

  // add role packages
  list.push(...input.packages);

  return list;
};

/**
 * .what = executes upgrade of rhachet and/or role packages
 * .why = enables `npx rhachet upgrade` workflow
 *
 * .note = defaults to upgrade all when no flags provided
 * .note = re-initializes roles after upgrade (link + init)
 */
export const execUpgrade = async (
  input: { self?: boolean; roleSpecs?: string[] },
  context: ContextCli,
): Promise<UpgradeResult> => {
  // determine what to upgrade (default = --self --roles *)
  const upgradeSelf = input.self ?? input.roleSpecs === undefined;
  const roleSpecs = input.roleSpecs ?? (input.self === true ? [] : ['*']);

  // expand wildcard: discover linked roles
  const expandedRoles = expandRoleSpecs({ specs: roleSpecs }, context);

  // resolve roles to package names
  const packages = await resolveRolesToPackages(
    { roles: expandedRoles },
    context,
  );

  // build npm install command
  const installList = buildInstallList({ self: upgradeSelf, packages });

  // execute npm install (fail fast)
  if (installList.length > 0) {
    execNpmInstall({ packages: installList }, context);
  }

  // re-init roles (link + init)
  if (expandedRoles.length > 0) {
    const specifiers: RoleSpecifier[] = expandedRoles.map(
      (r) => `${r.repo}/${r.role}`,
    );
    await initRolesFromPackages({ specifiers }, context);
  }

  // report success
  return { upgradedSelf: upgradeSelf, upgradedRoles: expandedRoles };
};
