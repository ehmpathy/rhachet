import { asRoleFocusParts } from '@src/domain.operations/roles/focus/asRoleFocusParts';
import { parseRoleSpecifier } from '@src/domain.operations/roles/parseRoleSpecifier';

import { asRoleSlugOfHookAuthor } from './asRoleSlugOfHookAuthor';

/**
 * .what = the repo slug a hook author names — the value of its `repo=` segment
 * .note = an author with no `repo=` segment names no repo, so it yields null
 */
const asRepoSlugOfHookAuthor = (input: { author: string }): string | null => {
  const segment = input.author
    .split('/')
    .find((part) => part.startsWith('repo='));
  return segment ? segment.slice('repo='.length) : null;
};

/**
 * .what = whether a hook author is one of the enrolled roles, or names no role at all
 * .why = a clone loads the hooks of its own roles and no other; an enrolled token may be a
 *        bare slug (`mechanic`, which carries that slug in every repo) or a pinned
 *        `repo/role` (`ehmpathy/mechanic`, which carries that one repo's role alone)
 *
 * .note = returns null for an author with no `role=` segment: the human's own hook, which
 *   names no role, and which each caller treats by its own contract
 * .note = a focus is stripped first: hooks follow the role, never the subject
 * .note = the role is read as a whole segment, so one slug never matches another it is a
 *   prefix of (`architect` vs `architect-ops`)
 */
export const isHookAuthorOfEnrolledRoles = (input: {
  author: string;
  roles: string[];
}): boolean | null => {
  // an author with no role segment names no role
  const roleOfAuthor = asRoleSlugOfHookAuthor({ author: input.author });
  if (roleOfAuthor === null) return null;
  const repoOfAuthor = asRepoSlugOfHookAuthor({ author: input.author });

  // a bare token matches the slug in any repo; a pinned token matches its repo alone
  return input.roles.some((token) => {
    const { repo, role } = parseRoleSpecifier({
      specifier: asRoleFocusParts({ token }).role,
    });
    if (role !== roleOfAuthor) return false;
    return repo === null || repo === repoOfAuthor;
  });
};
