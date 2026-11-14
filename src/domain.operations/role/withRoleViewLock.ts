import { withRepoMutex } from '@src/infra/lock/withRepoMutex';

import { join } from 'node:path';

/**
 * .what = run a write of the repo's role dirs while the one role view lock is held
 * .why = `roles link` and the modded view sync both rewrite a role's briefs/ and skills/;
 *        under one lock, a link never lands between the two renames of a view swap, and a
 *        swap leftover is always an orphan
 *
 * .note = the lock is not reentrant; a caller that holds it must not call another writer
 *   that takes it
 */
export const withRoleViewLock = <T>(
  input: { cwd: string },
  fn: () => Promise<T>,
): Promise<T> =>
  withRepoMutex(
    { repoPath: input.cwd, path: join(input.cwd, '.agent', 'repo=.mods') },
    fn,
  );
