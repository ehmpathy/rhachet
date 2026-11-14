import { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleModPlan } from '@src/domain.objects/RoleModPlan';
import type { RoleModSpec } from '@src/domain.objects/RoleModSpec';
import { asRepoSlugKind } from '@src/domain.operations/role/asRepoSlugKind';
import { asRoleDir } from '@src/domain.operations/role/asRoleDir';
import { getAllLinkedRoleRefs } from '@src/domain.operations/role/getAllLinkedRoleRefs';

import { asRoleDirCoordinates } from './asRoleDirCoordinates';
import { assertRoleModdedViewFresh } from './assertRoleModdedViewFresh';
import { assertRoleModSparesNativeRole } from './assertRoleModSparesNativeRole';

/**
 * .what = the mod a boot source's role dir boots under, proven fresh, or null
 * .why = `roles boot` and `roles cost` read a role through its `.agent/repo=X/role=Y` dir; the
 *        dir's own coordinates name the role, so a source needs no field of its own
 *
 * .note = a dir outside `.agent/repo=*\/role=*` (a manifest, a registry role) is never modded
 * .note = a `.this` role is never modded (F18): a mod that names it is refused here, at its boot
 * .note = the context is built by hand, not by `genContextCli`: that is async, and this read
 *   stays sync for its sync callers. the cwd is the root the dir sits under, so it stands as
 *   the gitroot too
 */
export const getOneRoleModForRoleDir = (input: {
  roleDir: string;
}): {
  spec: RoleModSpec;
  plan: RoleModPlan;
  ofLabel: string;
  roleDir: string;
} | null => {
  const coordinates = asRoleDirCoordinates({ roleDir: input.roleDir });
  if (!coordinates) return null;
  const { cwd, repo, role } = coordinates;
  const getRefsLinked = () =>
    getAllLinkedRoleRefs({}, new ContextCli({ cwd, gitroot: cwd }));

  // a native role is never modded; a mod that names it is refused at its boot (F18)
  if (asRepoSlugKind({ slug: repo }) !== 'package') {
    assertRoleModSparesNativeRole({ cwd, ref: { repo, role }, getRefsLinked });
    return null;
  }

  const mod = assertRoleModdedViewFresh({
    cwd,
    ref: { repo, role },
    getRefsLinked,
  });
  if (!mod) return null;
  return { ...mod, roleDir: asRoleDir({ cwd, ref: { repo, role } }) };
};
