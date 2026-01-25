/**
 * .what = branded type for brain supplier slug
 * .why = distinguishes slugs (e.g., 'anthropic') from full package names
 *
 * .note = slug is the suffix after 'rhachet-brains-'
 * .note = package name = `rhachet-brains-${slug}`
 *
 * .example = 'anthropic', 'opencode'
 */
export type BrainSupplierSlug = string & { __brand: 'BrainSupplierSlug' };

/**
 * .what = extracts slug from brain package name
 * .why = enables typed conversion from package names to slugs
 */
export const toBrainSupplierSlug = (packageName: string): BrainSupplierSlug =>
  packageName.replace('rhachet-brains-', '') as BrainSupplierSlug;
