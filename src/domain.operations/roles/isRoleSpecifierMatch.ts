import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';

import { parseRoleSpecifier } from './parseRoleSpecifier';

/**
 * .what = whether two role specifiers name the same role
 * .why = the one rule every role comparison shares: an unqualified specifier (`architect`)
 *   may name the role in any repo, so it matches any same-slug specifier; two qualified
 *   ones (`a/architect`, `b/architect`) match only within one repo
 *
 * .note = pure transformer — no i/o, deterministic
 */
export const isRoleSpecifierMatch = (input: {
  left: RoleSpecifier;
  right: RoleSpecifier;
}): boolean => {
  const left = parseRoleSpecifier({ specifier: input.left });
  const right = parseRoleSpecifier({ specifier: input.right });
  if (left.role !== right.role) return false;
  return left.repo === null || right.repo === null || left.repo === right.repo;
};
