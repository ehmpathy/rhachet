/**
 * .what = the kind a role-relative path belongs to, or null for a path outside both
 * .why = a mod may touch only briefs and skills; one reader of the prefix, so the plan, the
 *        hook check and the sync never disagree on what a path is
 */
export const asRoleResourceKind = (input: {
  path: string;
}): 'briefs' | 'skills' | null => {
  if (input.path.startsWith('briefs/')) return 'briefs';
  if (input.path.startsWith('skills/')) return 'skills';
  return null;
};
