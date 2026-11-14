import type { RoleModdedViewHookBasis } from '@src/domain.objects/RoleModdedViewRecord';

/**
 * .what = whether a view's recorded hook basis is the one the mod needs now
 * .why = a view built with no `not` of a skill, or against another package version, never
 *        passed the hook check the mod now needs
 */
export const isRoleModHookBasisSame = (input: {
  recorded: RoleModdedViewHookBasis | null;
  needed: RoleModdedViewHookBasis | null;
}): boolean => {
  if (input.recorded === null || input.needed === null)
    return input.recorded === input.needed;
  return input.recorded.version === input.needed.version;
};
