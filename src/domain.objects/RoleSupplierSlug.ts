/**
 * .what = branded type for role supplier slug
 * .why = distinguishes slugs (e.g., 'ehmpathy/*', 'ehmpathy/mechanic') from full package names
 *
 * .note = format: `$repo/*` for all roles in a repo, `$repo/$role` for specific role
 * .note = package name = `rhachet-roles-${repo}`
 *
 * .example = 'ehmpathy/*', 'ehmpathy/mechanic', 'bhuild/behaver'
 */
export type RoleSupplierSlug = string & { __brand: 'RoleSupplierSlug' };

/**
 * .what = extracts slug from role package name
 * .why = enables typed conversion from package names to slugs
 *
 * .note = returns `$repo/*` format (wildcard for all roles in repo)
 */
export const toRoleSupplierSlug = (packageName: string): RoleSupplierSlug =>
  `${packageName.replace('rhachet-roles-', '')}/*` as RoleSupplierSlug;

/**
 * .what = extracts repo from role supplier slug
 * .why = enables lookup of package name from slug
 *
 * .example = 'ehmpathy/mechanic' => 'ehmpathy'
 * .example = 'ehmpathy/*' => 'ehmpathy'
 */
export const getRepoFromRoleSupplierSlug = (slug: RoleSupplierSlug): string =>
  slug.split('/')[0] as string;

/**
 * .what = converts a role repo slug to its package name
 * .why = one place names the `rhachet-roles-$repo` convention, so no caller builds it by hand
 *
 * .example = 'ehmpathy' => 'rhachet-roles-ehmpathy'
 */
export const toRolePackageFromRepo = (repo: string): string =>
  `rhachet-roles-${repo}`;

/**
 * .what = converts role supplier slug to package name
 * .why = enables resolution from slug to npm package
 */
export const toRolePackageFromSlug = (slug: RoleSupplierSlug): string =>
  toRolePackageFromRepo(getRepoFromRoleSupplierSlug(slug));
