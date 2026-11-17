import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { asRoleRefsInEnrollmentOrder } from './asRoleRefsInEnrollmentOrder';

/**
 * .what = split role refs into the published roles and the `repo=.this` roles, each in
 *         the one enrollment order
 * .why = the boot is cached as a prefix: an edit voids every byte after it. published
 *        roles change only on an upgrade, local roles on any branch, so the published
 *        roles render first and a local edit costs only the tail
 *
 * .note = the identity hash still sorts by role slug alone (`asRoleSlugsInEnrollmentOrder`);
 *         this order shapes the render, never who the actor is
 * .note = any extra field a ref carries (a focus) rides through the split untouched
 */
export const asRoleRefsInCacheOrder = <TRef extends RoleLinkRef>(input: {
  refs: TRef[];
}): { published: TRef[]; local: TRef[] } => {
  const refsOrdered = asRoleRefsInEnrollmentOrder({ refs: input.refs });
  return {
    published: refsOrdered.filter((ref) => ref.repo !== '.this'),
    local: refsOrdered.filter((ref) => ref.repo === '.this'),
  };
};
