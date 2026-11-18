import { ConstraintError } from 'helpful-errors';

import { withRoleViewLock } from '@src/domain.operations/role/withRoleViewLock';

/**
 * .what = run a lock-free read of a modded view, and where it refuses, read it again under the
 *         role view lock
 * .why = a render swaps a kind dir by two renames under the role view lock, so a read between
 *        them refuses; the confirm re-reads under that same lock
 *
 * .note = a clean read takes no lock and writes no lock key, so the common boot pays naught
 * .note = only a ConstraintError (a stale view, or a refusal the render recorded) is confirmed;
 *   a malfunction propagates as thrown
 * .note = the lock is not reentrant: a caller that holds it reads the view directly, never via
 *   this wrapper
 * .note = cwd null names a dir outside the repo's role dirs, which no mod can reach; the read
 *   runs once
 */
export const withRoleModReadConfirmed = async <T>(
  input: { cwd: string | null },
  read: () => T,
): Promise<T> => {
  const cwd = input.cwd;
  try {
    return read();
  } catch (error) {
    if (!(error instanceof ConstraintError) || cwd === null) throw error;
    return withRoleViewLock({ cwd }, async () => read());
  }
};
