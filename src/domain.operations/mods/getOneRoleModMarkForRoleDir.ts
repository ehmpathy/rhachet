import { ConstraintError } from 'helpful-errors';

import type { RoleModPlan } from '@src/domain.objects/RoleModPlan';
import { RoleModViewStaleError } from '@src/domain.objects/RoleModViewStaleError';

import { getOneRoleModForRoleDir } from './getOneRoleModForRoleDir';

/**
 * .what = the mod mark of one cost sweep row: its plan, `'stale'` for a view that lags its mod,
 *         `'refused'` for a mod the render refused, or null for an unmodded role
 * .why = the sweep reports and never refuses (requirement 9), so the boot's refusal marks its
 *        row, by its type, with the fix that cause needs
 */
export const getOneRoleModMarkForRoleDir = (input: {
  roleDir: string;
}): RoleModPlan | 'stale' | 'refused' | null => {
  try {
    return getOneRoleModForRoleDir({ roleDir: input.roleDir })?.plan ?? null;
  } catch (error: unknown) {
    if (error instanceof RoleModViewStaleError) return 'stale';
    if (error instanceof ConstraintError) return 'refused';
    throw error;
  }
};
