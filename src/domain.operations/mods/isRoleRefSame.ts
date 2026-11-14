import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

/**
 * .what = whether two role refs name one role
 * .why = two repos may ship one role slug (F11); a ref is the repo and the role, never the slug
 */
export const isRoleRefSame = (input: {
  a: RoleLinkRef;
  b: RoleLinkRef;
}): boolean => input.a.repo === input.b.repo && input.a.role === input.b.role;
