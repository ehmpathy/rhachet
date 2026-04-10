/**
 * .what = transformers for execUpgrade orchestrator
 * .why = encapsulate decode-friction logic into named pure functions
 */
import {
  type BrainSupplierSlug,
  toBrainSupplierSlug,
} from '@src/domain.objects/BrainSupplierSlug';
import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';
import type { RoleSupplierSlug } from '@src/domain.objects/RoleSupplierSlug';

/**
 * .what = determines what to upgrade based on explicit flags and defaults
 * .why = default behavior is upgrade all (--self --roles * --brains *)
 */
export const determineUpgradeScope = (input: {
  self?: boolean;
  roleSpecs?: string[];
  brainSpecs?: string[];
}): { upgradeSelf: boolean; roleSpecs: string[]; brainSpecs: string[] } => {
  const upgradeSelf =
    input.self ??
    (input.roleSpecs === undefined && input.brainSpecs === undefined);
  const roleSpecs =
    input.roleSpecs ??
    (input.self === true || input.brainSpecs !== undefined ? [] : ['*']);
  const brainSpecs =
    input.brainSpecs ??
    (input.self === true || input.roleSpecs !== undefined ? [] : ['*']);
  return { upgradeSelf, roleSpecs, brainSpecs };
};

/**
 * .what = computes packages skipped due to local refs
 * .why = packages with file: or link: refs should not be upgraded from npm
 */
export const getSkippedPackages = (input: {
  rolePackages: string[];
  brainPackages: string[];
  upgradeSelf: boolean;
  localRefDeps: Set<string>;
}): string[] => {
  const allPackages = [...input.rolePackages, ...input.brainPackages];
  return [...input.localRefDeps].filter(
    (pkg) =>
      allPackages.includes(pkg) || (input.upgradeSelf && pkg === 'rhachet'),
  );
};

/**
 * .what = builds role specifiers from linked roles
 * .why = formats linked roles as repo/role specifiers for initRolesFromPackages
 */
export const buildRoleSpecifiers = (input: {
  linkedRoles: { repo: string; role: string }[];
}): RoleSpecifier[] => input.linkedRoles.map((r) => `${r.repo}/${r.role}`);

/**
 * .what = extracts brain slugs from packages that were actually upgraded
 * .why = filters out local refs and converts package names to slugs
 */
export const getUpgradedBrains = (input: {
  brainPackages: string[];
  localRefDeps: Set<string>;
}): BrainSupplierSlug[] =>
  input.brainPackages
    .filter((pkg) => !input.localRefDeps.has(pkg))
    .map((pkg) => toBrainSupplierSlug(pkg));

/**
 * .what = extracts role slugs from packages that were actually upgraded
 * .why = filters out local refs via package name derived from slug
 */
export const getUpgradedRoles = (input: {
  roleSlugs: RoleSupplierSlug[];
  localRefDeps: Set<string>;
}): RoleSupplierSlug[] =>
  input.roleSlugs.filter(
    (slug) => !input.localRefDeps.has(`rhachet-roles-${slug.split('/')[0]}`),
  );
