import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import type { RoleModSpec } from '@src/domain.objects/RoleModSpec';

import { getOneRoleModSpec } from './getOneRoleModSpec';
import { getOneRoleModTargetLinked } from './getOneRoleModTargetLinked';

/**
 * .what = a mod's spec, its files, and the one linked role it is over
 * .why = a boot of a same-slug role asks only "is this mod over me?"; the answer needs the spec
 *        and the target, never the plan, so a mod over one role never fails another's boot
 */
export const getOneRoleModTarget = (input: {
  cwd: string;
  role: string;
  refsLinked: RoleLinkRef[];
}): {
  modDir: string;
  spec: RoleModSpec;
  filesMod: string[];
  target: RoleLinkRef;
} => {
  const { modDir, spec, filesMod } = getOneRoleModSpec({
    cwd: input.cwd,
    role: input.role,
  });
  const target = getOneRoleModTargetLinked({
    of: spec.of,
    refsLinked: input.refsLinked,
  });
  return { modDir, spec, filesMod, target };
};
