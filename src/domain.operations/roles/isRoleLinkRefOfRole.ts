import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { isRoleSpecifierMatch } from './isRoleSpecifierMatch';

/**
 * .what = whether a linked ref is the one a role token names
 * .why = a repo-qualified token (`ehmpathy/mechanic`) and a bare one (`mechanic`) both name a
 *        linked ref (Q1); one predicate keeps every caller on the same match
 *
 * .note = pure transformer — no i/o, deterministic
 */
export const isRoleLinkRefOfRole = (input: {
  ref: RoleLinkRef;
  role: string;
}): boolean =>
  isRoleSpecifierMatch({
    left: `${input.ref.repo}/${input.ref.role}`,
    right: input.role,
  });
