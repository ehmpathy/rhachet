import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { asRoleSlugsInEnrollmentOrder } from '@src/domain.operations/actor/enrolled/asRoleSlugsInEnrollmentOrder';

/**
 * .what = order role refs by role, through the one enrollment comparator
 * .why = the corpus order and the identity hash then share one sort, so a
 *        roleset renders to the same bytes whatever order it arrived in
 *
 * .note = two repos may ship one role slug (F11); refs of one role are then ordered by repo,
 *   in code-point order, so the render is stable on any fs
 * .note = any extra field a ref carries (a focus) rides through the sort untouched
 */
export const asRoleRefsInEnrollmentOrder = <TRef extends RoleLinkRef>(input: {
  refs: TRef[];
}): TRef[] => {
  const slugsOrdered = asRoleSlugsInEnrollmentOrder({
    slugs: [...new Set(input.refs.map((ref) => ref.role))],
  });
  return [...input.refs].sort((a, b) => {
    const byRole = slugsOrdered.indexOf(a.role) - slugsOrdered.indexOf(b.role);
    if (byRole !== 0) return byRole;
    if (a.repo === b.repo) return 0;
    return a.repo < b.repo ? -1 : 1;
  });
};
