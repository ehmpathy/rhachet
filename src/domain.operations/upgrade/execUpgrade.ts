import {
  type BrainSupplierSlug,
  toBrainSupplierSlug,
} from '@src/domain.objects/BrainSupplierSlug';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';
import type { RoleSupplierSlug } from '@src/domain.objects/RoleSupplierSlug';
import { initRolesFromPackages } from '@src/domain.operations/init/initRolesFromPackages';
import { syncHooksForLinkedRoles } from '@src/domain.operations/init/syncHooksForLinkedRoles';

import { execNpmInstall } from './execNpmInstall';
import { expandRoleSupplierSlugs } from './expandRoleSupplierSlugs';
import { getLocalRefDependencies } from './getLocalRefDependencies';
import { resolveBrainsToPackages } from './resolveBrainsToPackages';

/**
 * .what = result of upgrade operation
 * .why = provides structured summary of what was upgraded
 */
export interface UpgradeResult {
  upgradedSelf: boolean;
  upgradedRoles: RoleSupplierSlug[];
  upgradedBrains: BrainSupplierSlug[];
}

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

  // add role packages (exclude local refs)
  for (const pkg of input.rolePackages) {
    if (!input.exclude.has(pkg)) {
      list.push(pkg);
    }
  }

  // add brain packages (exclude local refs)
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

  // expand role specs to packages and linked roles
  const roleExpanded = await expandRoleSupplierSlugs(
    { specs: roleSpecs },
    context,
  );

  // resolve brains to package names
  const brainPackages = await resolveBrainsToPackages(
    { specs: brainSpecs },
    context,
  );

  // detect local ref dependencies to exclude (file: or link:)
  const localRefDeps = getLocalRefDependencies({ cwd: context.cwd });

  // log skipped packages
  if (localRefDeps.size > 0) {
    const allPackages = [...roleExpanded.packages, ...brainPackages];
    const skipped = [...localRefDeps].filter(
      (pkg) => allPackages.includes(pkg) || (upgradeSelf && pkg === 'rhachet'),
    );
    if (skipped.length > 0) {
      console.log(`🫧 skip (local refs): ${skipped.join(', ')}`);
    }
  }

  // build npm install command
  const installList = buildInstallList({
    self: upgradeSelf,
    rolePackages: roleExpanded.packages,
    brainPackages,
    exclude: localRefDeps,
  });

  // execute npm install (fail fast)
  if (installList.length > 0) {
    execNpmInstall({ packages: installList }, context);
  }

  // re-init only linked roles (not all roles in upgraded packages)
  if (roleExpanded.linkedRoles.length > 0) {
    const specifiers: RoleSpecifier[] = roleExpanded.linkedRoles.map(
      (r) => `${r.repo}/${r.role}`,
    );
    await initRolesFromPackages({ specifiers }, context);

    // sync hooks for linked roles (always on for upgrade)
    await syncHooksForLinkedRoles({}, context);
  }

  // extract slugs from brain packages for result
  const upgradedBrains = brainPackages
    .filter((pkg) => !localRefDeps.has(pkg))
    .map((pkg) => toBrainSupplierSlug(pkg));

  // filter role slugs for packages that were actually upgraded (not excluded)
  const upgradedRoles = roleExpanded.slugs.filter(
    (slug) => !localRefDeps.has(`rhachet-roles-${slug.split('/')[0]}`),
  );

  // report success
  return {
    upgradedSelf: upgradeSelf,
    upgradedRoles,
    upgradedBrains,
  };
};
