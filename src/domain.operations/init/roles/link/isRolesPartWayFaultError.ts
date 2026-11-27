import { RolesPartWayConstraintError } from './RolesPartWayConstraintError';
import { RolesPartWayMalfunctionError } from './RolesPartWayMalfunctionError';

/**
 * .what = whether an error is a part-way role init fault
 * .why = `rhx init` syncs hooks to the linked roles only for a part-way fault, never for one
 *   raised before any role linked
 */
export const isRolesPartWayFaultError = (
  error: unknown,
): error is RolesPartWayConstraintError | RolesPartWayMalfunctionError =>
  error instanceof RolesPartWayConstraintError ||
  error instanceof RolesPartWayMalfunctionError;
