/**
 * .what = each slug that appears more than once, in the order its repeats appear
 * .why = both actor validators (the repo manifest and a published list) refuse a slug
 *        declared twice; one owner keeps that rule the same in both
 */
export const asSlugsDuplicated = (input: { slugs: string[] }): string[] =>
  input.slugs.filter((slug, index) => input.slugs.indexOf(slug) !== index);
