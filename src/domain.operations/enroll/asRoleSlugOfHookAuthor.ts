/**
 * .what = the role slug a hook author names — the value of its `role=` segment
 * .why = an author is `repo=X/role=Y`; the role is read as a whole segment so that one
 *   slug never matches another it is a prefix of (`architect` vs `architect-ops`)
 * .note = an author with no `role=` segment names no role, so it yields null
 */
export const asRoleSlugOfHookAuthor = (input: {
  author: string;
}): string | null => {
  const segment = input.author
    .split('/')
    .find((part) => part.startsWith('role='));
  return segment ? segment.slice('role='.length) : null;
};
