import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { isRoleRefSame } from './isRoleRefSame';

/**
 * .what = whether a mod pinned to `ofRepo` is over another linked role of this ref's slug
 * .why = two repos may ship one role slug (F11); a mod pinned to the other one leaves this ref
 *        to boot as published
 *
 * .note = false where the mod pins no repo, pins this ref's own repo, or pins a repo no link
 *   holds — the last is a typo, and its refusal is the plan's to raise
 */
export const isRoleModOfAnotherLinkedRole = (input: {
  ofRepo: string | null;
  ref: RoleLinkRef;
  refsLinked: RoleLinkRef[];
}): boolean => {
  const { ofRepo } = input;
  if (!ofRepo || ofRepo === input.ref.repo) return false;
  const refOfMod = { repo: ofRepo, role: input.ref.role };
  return input.refsLinked.some((ref) => isRoleRefSame({ a: ref, b: refOfMod }));
};
