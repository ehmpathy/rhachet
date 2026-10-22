import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { asRoleSlugsInEnrollmentOrder } from '@src/domain.operations/actor/enrolled/asRoleSlugsInEnrollmentOrder';

/**
 * .what = order role refs by role, through the one enrollment comparator
 * .why = the corpus order and the identity hash then share one sort, so a
 *        roleset renders to the same bytes whatever order it arrived in
 *
 * .note = one ref per role is assumed; asRoleRefsFirstSeenPerRole dedupes first
 * .note = any extra field a ref carries (a focus) rides through the sort untouched
 */
export const asRoleRefsInEnrollmentOrder = <TRef extends RoleLinkRef>(input: {
  refs: TRef[];
}): TRef[] => {
  const slugsOrdered = asRoleSlugsInEnrollmentOrder({
    slugs: input.refs.map((ref) => ref.role),
  });
  return [...input.refs].sort(
    (a, b) => slugsOrdered.indexOf(a.role) - slugsOrdered.indexOf(b.role),
  );
};
