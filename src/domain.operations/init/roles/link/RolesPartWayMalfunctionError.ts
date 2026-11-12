import { MalfunctionError } from 'helpful-errors';

/**
 * .what = a part-way role init the system must fix: any other role init fault
 * .why = a distinct type, so `rhx init` can tell a part-way fault from a fault before any link
 */
export class RolesPartWayMalfunctionError extends MalfunctionError {}
