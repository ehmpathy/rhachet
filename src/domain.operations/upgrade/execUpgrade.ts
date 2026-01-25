import {
  type BrainSupplierSlug,
  toBrainSupplierSlug,
} from '@src/domain.objects/BrainSupplierSlug';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';
import { initRolesFromPackages } from '@src/domain.operations/init/initRolesFromPackages';

import { discoverLinkedRoles, type RoleLinkRef } from './discoverLinkedRoles';
import { execNpmInstall } from './execNpmInstall';
import { getFileDotDependencies } from './getFileDotDependencies';
import { resolveBrainsToPackages } from './resolveBrainsToPackages';
import { resolveRolesToPackages } from './resolveRolesToPackages';

/**
 * .what = result of upgrade operation
 * .why = provides structured summary of what was upgraded
 */
export interface UpgradeResult {
  upgradedSelf: boolean;
  upgradedRoles: RoleLinkRef[];
  upgradedBrains: BrainSupplierSlug[];
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
 * .why = combines self (rhachet) with role and brain packages for npm install
 */
const buildInstallList = (input: {
  self: boolean;
  rolePackages: string[];
  brainPackages: string[];
  exclude: Set<string>;
}): string[] => {
  const list: string[] = [];

  // add rhachet if self upgrade requested (and not excluded)
  if (input.self && !input.exclude.has('rhachet')) {
    list.push('rhachet');
  }

  // add role packages (exclude file:. deps)
  for (const pkg of input.rolePackages) {
    if (!input.exclude.has(pkg)) {
      list.push(pkg);
    }
  }

  // add brain packages (exclude file:. deps)
  for (const pkg of input.brainPackages) {
    if (!input.exclude.has(pkg)) {
      list.push(pkg);
    }
  }

  return list;
};

/**
 * .what = executes upgrade of rhachet, role packages, and/or brain packages
 * .why = enables `npx rhachet upgrade` workflow
 *
 * .note = defaults to upgrade all when no flags provided
 * .note = re-initializes roles after upgrade (link + init)
 */
export const execUpgrade = async (
  input: { self?: boolean; roleSpecs?: string[]; brainSpecs?: string[] },
  context: ContextCli,
): Promise<UpgradeResult> => {
  // determine what to upgrade (default = --self --roles * --brains *)
  const upgradeSelf =
    input.self ??
    (input.roleSpecs === undefined && input.brainSpecs === undefined);
  const roleSpecs =
    input.roleSpecs ??
    (input.self === true || input.brainSpecs !== undefined ? [] : ['*']);
  const brainSpecs =
    input.brainSpecs ??
    (input.self === true || input.roleSpecs !== undefined ? [] : ['*']);

  // expand wildcard: discover linked roles
  const expandedRoles = expandRoleSpecs({ specs: roleSpecs }, context);

  // resolve roles to package names
  const rolePackages = await resolveRolesToPackages(
    { roles: expandedRoles },
    context,
  );

  // resolve brains to package names
  const brainPackages = await resolveBrainsToPackages(
    { specs: brainSpecs },
    context,
  );

  // detect file:. dependencies to exclude
  const fileDotDeps = getFileDotDependencies({ cwd: context.cwd });

  // log skipped packages
  if (fileDotDeps.size > 0) {
    const allPackages = [...rolePackages, ...brainPackages];
    const skipped = [...fileDotDeps].filter(
      (pkg) => allPackages.includes(pkg) || (upgradeSelf && pkg === 'rhachet'),
    );
    if (skipped.length > 0) {
      console.log(`🫧 skip (file:. deps): ${skipped.join(', ')}`);
    }
  }

  // build npm install command
  const installList = buildInstallList({
    self: upgradeSelf,
    rolePackages,
    brainPackages,
    exclude: fileDotDeps,
  });

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

  // extract slugs from brain packages for result
  const upgradedBrains = brainPackages
    .filter((pkg) => !fileDotDeps.has(pkg))
    .map((pkg) => toBrainSupplierSlug(pkg));

  // report success
  return {
    upgradedSelf: upgradeSelf,
    upgradedRoles: expandedRoles,
    upgradedBrains,
  };
};
