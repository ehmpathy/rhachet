import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';
import { discoverLinkedRoles } from '@src/domain.operations/role/discoverLinkedRoles';

import { asRoleRefsInEnrollmentOrder } from './asRoleRefsInEnrollmentOrder';
import { getOneRoleContentDefectsOrNone } from './getOneRoleContentDefectsOrNone';

/**
 * .what = every content defect in each package role linked under `.agent/`
 * .why = a linked role's defect is its supplier's to repair, so the stop never holds on it;
 *        it warns, and names each lever: an upgrade, a mod, or a report to its owner
 *
 * .note = each role is read through the birth's own render, so every kind a birth sets aside
 *   (an orphan, a boundary literal, a spec that will not parse) is named here too
 * .note = roles are walked in enrollment order, as the render walks them, so the defect rows a
 *   stop or a roster prints are pinned by input, never by disk enumeration order
 */
export const getAllLinkedRoleContentDefects = async (
  _input: Record<string, never>,
  context: ContextCli,
): Promise<RoleContentDefect[]> => {
  const defectsByRole = await Promise.all(
    asRoleRefsInEnrollmentOrder({
      refs: discoverLinkedRoles({}, context),
    }).map((ref) => getOneRoleContentDefectsOrNone({ ref, cwd: context.cwd })),
  );
  return defectsByRole.flat();
};
