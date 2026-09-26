import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

/**
 * .what = keep one ref per role slug, the first seen
 * .why = one slug, one dir — the rule enroll already applies to a slug linked from two repos
 */
export const asRoleRefsFirstSeenPerRole = (input: {
  refs: RoleLinkRef[];
}): RoleLinkRef[] =>
  input.refs.filter(
    (ref, index) =>
      input.refs.findIndex((other) => other.role === ref.role) === index,
  );
