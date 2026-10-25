import { ConstraintError, MalfunctionError } from 'helpful-errors';

/**
 * .what = a part-way role init a caller must fix: a role's init refused as a ConstraintError
 * .why = a distinct type, so `rhx init` can tell a part-way fault from a fault before any link
 */
export class RolesPartWayConstraintError extends ConstraintError {}

/**
 * .what = a part-way role init the system must fix: any other role init fault
 * .why = a distinct type, so `rhx init` can tell a part-way fault from a fault before any link
 */
export class RolesPartWayMalfunctionError extends MalfunctionError {}

/**
 * .what = whether an error is a part-way role init fault
 */
export const isRolesPartWayFaultError = (
  error: unknown,
): error is RolesPartWayConstraintError | RolesPartWayMalfunctionError =>
  error instanceof RolesPartWayConstraintError ||
  error instanceof RolesPartWayMalfunctionError;

/**
 * .what = name a role init that stopped part-way: which role failed, which roles linked, which did not
 * .why = the loop stops at the first failed role (F5), so a tree is left with some roles linked and
 *   some not. a bare "init command failed" names none of that; this names all three sets, so the
 *   human knows what the tree holds and what to rerun (vision case 3)
 *
 * .note = the class follows the cause: a ConstraintError cause stays a constraint (exit 2), any
 *   other cause is a malfunction (exit 1), the same exit an unnamed role fault had
 * .note = the failed role is in `linked`: its link landed before its init ran (F1)
 */
export const asRolesPartWayFaultError = (input: {
  cause: Error;
  failed: { repo: string; role: string };
  linked: { repo: string; role: string }[];
  notLinked: { repo: string; role: string }[];
}): RolesPartWayConstraintError | RolesPartWayMalfunctionError => {
  const asSlug = (one: { repo: string; role: string }): string =>
    `repo=${one.repo}/role=${one.role}`;
  const message = `role init failed part-way, at ${asSlug(input.failed)}`;
  const metadata = {
    failed: asSlug(input.failed),
    linked: input.linked.map(asSlug),
    notLinked: input.notLinked.map(asSlug),
    hint: 'fix the failed init, then rerun the same command',
    cause: input.cause,
  };
  if (input.cause instanceof ConstraintError)
    return new RolesPartWayConstraintError(message, metadata);
  return new RolesPartWayMalfunctionError(message, metadata);
};
