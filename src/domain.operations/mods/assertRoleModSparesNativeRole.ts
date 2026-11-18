import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { getOneRoleModSpec } from './getOneRoleModSpec';
import { getOneRoleModTargetLinked } from './getOneRoleModTargetLinked';
import { isRoleModPinnedToRef } from './isRoleModPinnedToRef';

/**
 * .what = refuse the boot of a native role while a mod of its slug names it
 * .why = a mod of a `.this` role is refused (F18): the role is this repo's own, so it is edited
 *        in place. a package role raises such a refusal from its view record; a native role has
 *        no view, so its boot raises it, and the actor that carries the role fails loud
 *
 * .note = a no-op where no mod names this role, so an unmodded repo pays one existence check
 * .note = the refusal is the one `getOneRoleModTargetLinked` raises for a native `of:`, so the
 *   render and the boot both name it in the same words
 */
export const assertRoleModSparesNativeRole = (input: {
  cwd: string;
  ref: RoleLinkRef;
  getRefsLinked: () => RoleLinkRef[];
}): void => {
  if (!isRoleModPinnedToRef({ cwd: input.cwd, ref: input.ref })) return;
  const { spec } = getOneRoleModSpec({ cwd: input.cwd, role: input.ref.role });
  getOneRoleModTargetLinked({ of: spec.of, refsLinked: input.getRefsLinked() });
};
