/**
 * .what = extract env from env-scoped slug
 * .why = fix messages need env to construct proper --env flag
 */
export const asKeyrackKeyEnv = (input: { slug: string }): string => {
  // slug format: $org.$env.$key
  // split on dot, take second part
  const parts = input.slug.split('.');
  return parts[1] ?? '';
};
