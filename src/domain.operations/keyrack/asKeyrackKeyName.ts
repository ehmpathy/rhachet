/**
 * .what = extract raw key name from env-scoped slug
 * .why = export layer needs raw names (AWS_PROFILE, not ehmpathy.prep.AWS_PROFILE)
 */
export const asKeyrackKeyName = (input: { slug: string }): string => {
  // split on dot, take all parts after org.env prefix
  const parts = input.slug.split('.');
  return parts.slice(2).join('.');
};
