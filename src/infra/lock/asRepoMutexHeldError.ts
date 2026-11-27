import { ConstraintError } from 'helpful-errors';

/**
 * .what = each lock-timeout error this module minted
 * .why = a catch that admits any ConstraintError must still tell a held lock apart, with no new
 *        class name in the error a human reads and no new key in its metadata
 */
const ERRORS_MINTED = new WeakSet<Error>();

/**
 * .what = the error a wait for a repo lock throws when another rhx process holds it past the wait
 * .why = one mint, so every holder of the lock reads the same words and the same fix
 */
export const asRepoMutexHeldError = (input: {
  path: string;
  waitMs: number;
  cause: Error;
}): Error => {
  const error = new ConstraintError('another rhx process holds this file', {
    path: input.path,
    waitMs: input.waitMs,
    hint: 'wait for the other rhx init / enroll to finish, then retry. a hold left by a killed rhx lapses on its own within five minutes',
    cause: input.cause,
  });
  ERRORS_MINTED.add(error);
  return error;
};

/**
 * .what = whether a thrown value is a repo lock that another rhx process held past the wait
 * .why = a held lock is host contention, never a fault of what the lock guards, so a catch that
 *        classes faults by error class lets it escape (e.g. the mod gate, F04)
 */
export const isRepoMutexHeldError = (input: { error: unknown }): boolean =>
  input.error instanceof Error && ERRORS_MINTED.has(input.error);
