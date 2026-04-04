/**
 * .what = extract org from env-scoped slug
 * .why = fill needs org to store keys under correct org
 */
export const asKeyrackKeyOrg = (input: { slug: string }): string => {
  // slug format: $org.$env.$key
  // split on dot, take first part
  const parts = input.slug.split('.');
  return parts[0] ?? '';
};
