import type { RoleSlug } from '@src/domain.objects/RoleSlug';

import { isRolesetEqual } from './isRolesetEqual';

/**
 * .what = whether a resolved roleset IS the ambient roleset — set-equal, order ignored
 * .why = identity by roleset: roles whose set equals the ambient roles ARE ambient (the
 *        collapsed state), whether they came bare or named in full by `--roles`
 */
export const isRolesetAmbient = (input: {
  roles: RoleSlug[];
  rolesAmbient: RoleSlug[];
}): boolean => isRolesetEqual({ left: input.roles, right: input.rolesAmbient });
