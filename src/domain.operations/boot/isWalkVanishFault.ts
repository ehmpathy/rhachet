import { ConstraintError } from 'helpful-errors';

/**
 * .what = the errnos a vanish race raises when a path is removed or relinked mid-walk
 */
const ERRNOS_OF_VANISH = new Set(['ENOENT', 'ENOTDIR', 'ELOOP']);

/**
 * .what = whether a thrown value is a caller-fixable walk fault: a moved or vanished boot
 *   tree, or any other `ConstraintError` the re-walk raised (an invalid boot.yml, an orphan
 *   `.md.min` brief)
 * .why = the subject-margin walk discloses exactly this class beside a breach, with the
 *   fault's own message; every other class — a `MalfunctionError`, an `EACCES`, a
 *   `TypeError` — rethrows to its own exit code
 */
export const isWalkVanishFault = (
  error: unknown,
): error is Error & { code?: string } => {
  if (error instanceof ConstraintError) return true;

  // duck-typed, never `instanceof Error` — a node fs error comes from another realm under a
  // vm sandbox (jest), where the realm check is false for a genuine errno
  if (typeof error !== 'object' || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && ERRNOS_OF_VANISH.has(code);
};
