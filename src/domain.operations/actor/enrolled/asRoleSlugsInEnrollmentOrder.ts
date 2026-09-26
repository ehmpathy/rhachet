/**
 * .what = the one role-slug order an enrollment uses
 * .why = the identity hash and the boot corpus both sort roles through this one
 *        comparator, so the two cannot diverge
 *
 * .note = sorts a copy; the caller's array is never mutated
 */
export const asRoleSlugsInEnrollmentOrder = <TSlug extends string>(input: {
  slugs: TSlug[];
}): TSlug[] => [...input.slugs].sort();
