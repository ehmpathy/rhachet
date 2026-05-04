import { asHashSha256Sync } from 'hash-fns';

/**
 * .what = computes the 16-char slug hash for keyrack paths
 * .why = DRY — multiple usages: os.secure vault, inventory
 */
export const asKeyrackSlugHash = (input: { slug: string }): string =>
  asHashSha256Sync(input.slug).slice(0, 16);
