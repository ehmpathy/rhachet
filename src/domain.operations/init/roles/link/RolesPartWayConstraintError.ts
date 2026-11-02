import { ConstraintError } from 'helpful-errors';

/**
 * .what = a part-way role init a caller must fix: a role's init refused as a ConstraintError
 * .why = a distinct type, so `rhx init` can tell a part-way fault from a fault before any link
 */
export class RolesPartWayConstraintError extends ConstraintError {}
