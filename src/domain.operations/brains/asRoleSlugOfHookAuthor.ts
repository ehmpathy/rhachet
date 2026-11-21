/**
 * .what = the role slug a hook author names — the value of its `role=` segment
 * .why = an author is `repo=X/role=Y`; the role is read as a whole segment so that one
 *   slug never matches another it is a prefix of (`architect` vs `architect-ops`)
 * .note = the one parse of a hook author: `isHookAuthorOfRole` and
 *   `isHookAuthorOfEnrolledRoles` both read it, so no two callers disagree on what a role
 *   author is
 * .note = an author with no nonempty `repo=` segment, or no nonempty `role=` segment, names no
 *   role, so it yields null
 */
export const asRoleSlugOfHookAuthor = (input: {
  author: string;
}): string | null => {
  const segments = input.author.split('/');
  const repo = segments.find((part) => part.startsWith('repo='));
  const role = segments.find((part) => part.startsWith('role='));
  if (!repo || repo === 'repo=') return null;
  if (!role || role === 'role=') return null;
  return role.slice('role='.length);
};
