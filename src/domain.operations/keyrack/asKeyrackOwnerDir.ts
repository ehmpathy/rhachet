/**
 * .what = computes the owner directory segment for keyrack paths
 * .why = DRY — 3+ usages: os.secure vault, os.direct vault, inventory
 */
export const asKeyrackOwnerDir = (input: { owner: string | null }): string =>
  `owner=${input.owner ?? 'default'}`;
