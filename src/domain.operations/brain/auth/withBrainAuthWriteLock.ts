import { withDirLock } from '@src/infra/withDirLock';

import { dirname, join } from 'node:path';

/**
 * .what = run a procedure while it holds claude-code's own login write lock
 * .why = claude-code serializes every write to the shared login under one lock,
 *   `~/.claude/.storage-write` (proper-lockfile, `realpath: false`, `stale: 15000`).
 *   a read-decide-write of the shared login outside that lock races a `/login` or a
 *   refresh; inside it, no claude-code writer can interleave
 *
 * .note = withDirLock speaks proper-lockfile's protocol (a `<file>.lock` dir, stale
 *   after 15s, refreshed every 5s as claude-code's `.oauth_refresh.lock` does, per
 *   claude-code 2.1.280), so the two exclude each other
 */
export const withBrainAuthWriteLock = async <T>(
  input: { brainAuthPath: string },
  procedure: () => T | Promise<T>,
): Promise<T> =>
  withDirLock(
    {
      lockPath: join(dirname(input.brainAuthPath), '.storage-write.lock'),
      refusal: {
        message:
          'the claude login write lock stayed held; the shared login was not touched',
        hint: 'a live claude-code process holds the lock past the wait; retry the enroll. a lock dir older than 15s is stale, and is cleared on the next try',
      },
    },
    procedure,
  );
