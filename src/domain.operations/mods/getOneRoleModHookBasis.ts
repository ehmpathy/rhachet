import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import type { RoleModdedViewHookBasis } from '@src/domain.objects/RoleModdedViewRecord';
import type { RoleModPlan } from '@src/domain.objects/RoleModPlan';

import { asRoleResourceKind } from './asRoleResourceKind';
import { getOneRolePackageVersion } from './getOneRolePackageVersion';

/**
 * .what = what the hook check of a mod's `not`s was made against: the installed version of
 *         the role's package, or null where the mod `not`s no skill
 * .why = a hook ships with the package, so a bump that adds a hook over a `not`ed skill leaves
 *        the file set as it was; the view must then read as stale, so the check runs again
 *        (usecase 9)
 *
 * .note = a cheap read of one package.json, so a boot pays no package import
 */
export const getOneRoleModHookBasis = (input: {
  cwd: string;
  ref: RoleLinkRef;
  plan: RoleModPlan;
}): RoleModdedViewHookBasis | null => {
  const hasNotOfSkill = input.plan.nots.some(
    (path) => asRoleResourceKind({ path }) === 'skills',
  );
  if (!hasNotOfSkill) return null;
  return {
    version: getOneRolePackageVersion({ cwd: input.cwd, repo: input.ref.repo }),
  };
};
