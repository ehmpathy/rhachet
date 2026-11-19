import { ConstraintError, MalfunctionError } from 'helpful-errors';

/**
 * .what = the error the boot drift onStop hook throws for a fault it met
 * .why = a Stop hook's exit 2 blocks the stop, and a ConstraintError exits 2; so a constraint met
 *        inside the hook is recast to a MalfunctionError (exit 1), which never blocks a stop.
 *        every other error passes through as it was thrown
 * .note = no op on the hook's path throws a ConstraintError today; the recast holds the exit-1
 *         guarantee for any that does later
 */
export const asBootDriftHookFault = (input: {
  error: unknown;
  serial: string;
}): unknown => {
  // a constraint would exit 2 and block the stop: recast it, under a message of its own
  if (input.error instanceof ConstraintError)
    return new MalfunctionError(
      'the boot drift hook could not read this clone',
      {
        serial: input.serial,
        cause: input.error,
        hint: `inspect it by hand: rhx clone boot drift --of @:${input.serial}`,
      },
    );

  // any other error is already exit 1 or a defect; it passes as thrown
  return input.error;
};
