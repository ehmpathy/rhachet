import type { BrainSupplierSlug } from '@src/domain.objects/BrainSupplierSlug';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleSupplierSlug } from '@src/domain.objects/RoleSupplierSlug';
import { initRolesFromPackages } from '@src/domain.operations/init/initRolesFromPackages';
import { syncHooksForLinkedRoles } from '@src/domain.operations/init/syncHooksForLinkedRoles';

import { detectInvocationMethod } from './detectInvocationMethod';
import { execNpmInstallGlobal } from './execNpmInstallGlobal';
import { execNpmInstallLocal } from './execNpmInstallLocal';
import { expandRoleSupplierSlugs } from './expandRoleSupplierSlugs';
import { getGlobalRhachetVersion } from './getGlobalRhachetVersion';
import { getLocalRefDependencies } from './getLocalRefDependencies';
import { resolveBrainsToPackages } from './resolveBrainsToPackages';
import {
  buildRoleSpecifiers,
  determineUpgradeScope,
  getSkippedPackages,
  getUpgradedBrains,
  getUpgradedRoles,
} from './transformers';

/**
 * .what = result of upgrade operation
 * .why = provides structured summary of what was upgraded
 */
export interface UpgradeResult {
  upgradedSelf: {
    local: boolean;
    global: { upgraded: boolean; error?: string } | null;
  };
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

type WhichTarget = 'local' | 'global';

/**
 * .what = determines which upgrade targets based on input and invocation method
 * .why = npx invocation defaults to local only, global invocation defaults to both
 */
const getWhichTargets = (input: {
  which?: 'local' | 'global' | 'both';
}): WhichTarget[] => {
  if (input.which === 'local') return ['local'];
  if (input.which === 'global') return ['global'];
  if (input.which === 'both') return ['local', 'global'];
  // default based on invocation method
  const method = detectInvocationMethod();
  if (method === 'npx') return ['local'];
  return ['local', 'global'];
};

/**
 * .what = executes upgrade of rhachet, role packages, and/or brain packages
 * .why = enables `npx rhachet upgrade` workflow
 *
 * .note = defaults to upgrade all when no flags provided
 * .note = re-initializes roles after upgrade (link + init)
 * .note = which='both' upgrades local and global installs
 * .note = global failure does not block local upgrade (per criteria usecase.3)
 */
export const execUpgrade = async (
  input: {
    self?: boolean;
    roleSpecs?: string[];
    brainSpecs?: string[];
    which?: 'local' | 'global' | 'both';
  },
  context: ContextCli,
): Promise<UpgradeResult> => {
  // determine upgrade targets
  const whichTargets = getWhichTargets({ which: input.which });

  // determine what to upgrade (default = --self --roles * --brains *)
  const { upgradeSelf, roleSpecs, brainSpecs } = determineUpgradeScope({
    self: input.self,
    roleSpecs: input.roleSpecs,
    brainSpecs: input.brainSpecs,
  });

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
    const skipped = getSkippedPackages({
      rolePackages: roleExpanded.packages,
      brainPackages,
      upgradeSelf,
      localRefDeps,
    });
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

  // execute local npm install (fail fast)
  if (whichTargets.includes('local') && installList.length > 0) {
    execNpmInstallLocal({ packages: installList }, context);
  }

  // global upgrade (if requested) — happens right after local, before roles
  // .note = per criteria usecase.3, global failure should NOT block local upgrade
  // .note = this is intentional warn-and-continue, NOT fail-hide:
  //         - error is logged visibly
  //         - error is returned in result.upgradedGlobal.error
  //         - caller can inspect and act on the failure
  let upgradedGlobal: { upgraded: boolean; error?: string } | null = null;
  if (whichTargets.includes('global')) {
    const globalVersion = getGlobalRhachetVersion();
    if (globalVersion !== null) {
      // global rhachet is installed — upgrade it
      try {
        upgradedGlobal = execNpmInstallGlobal({ packages: ['rhachet'] });
      } catch (error) {
        // warn and continue (criteria usecase.3: exits with success sothat local not blocked)
        const message = error instanceof Error ? error.message : String(error);
        const isPermissionError =
          message.includes('EACCES') || message.includes('EPERM');
        console.log('');
        console.log('❌ rhachet upgrade globally failed');
        console.log(
          `   └── ${isPermissionError ? 'permission denied' : message}`,
        );
        console.log('');
        upgradedGlobal = { upgraded: false, error: message };
      }
    }
    // if globalVersion is null, global rhachet not installed — skip silently
  }

  // re-init only linked roles (not all roles in upgraded packages)
  if (whichTargets.includes('local') && roleExpanded.linkedRoles.length > 0) {
    const specifiers = buildRoleSpecifiers({
      linkedRoles: roleExpanded.linkedRoles,
    });
    await initRolesFromPackages({ specifiers }, context);

    // sync hooks for linked roles (always on for upgrade)
    await syncHooksForLinkedRoles({}, context);
  }

  // extract slugs from brain packages for result
  const upgradedBrains = getUpgradedBrains({ brainPackages, localRefDeps });

  // filter role slugs for packages that were actually upgraded (not excluded)
  const upgradedRoles = getUpgradedRoles({
    roleSlugs: roleExpanded.slugs,
    localRefDeps,
  });

  // report success
  return {
    upgradedSelf: {
      local: whichTargets.includes('local') ? upgradeSelf : false,
      global: upgradedGlobal,
    },
    upgradedRoles: whichTargets.includes('local') ? upgradedRoles : [],
    upgradedBrains: whichTargets.includes('local') ? upgradedBrains : [],
  };
};
