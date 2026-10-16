import { withDirLock } from '@src/infra/withDirLock';

import { basename, dirname, join } from 'node:path';

/**
 * .what = run a procedure while it holds the dir lock of one keyrack manifest file
 * .why = a read-edit-write of keyrack.yml races a parallel `keyrack set`, `del`, or
 *   init; inside the lock, the second writer reads the first writer's file
 * .note = the lock is a dot dir beside the manifest (`.keyrack.yml.lock`), empty and
 *   transient, so git never tracks it
 */
export const withKeyrackManifestWriteLock = <T>(
  input: { path: string },
  procedure: () => T | Promise<T>,
): Promise<T> =>
  withDirLock(
    {
      lockPath: join(dirname(input.path), `.${basename(input.path)}.lock`),
      refusal: {
        message:
          'the keyrack.yml write lock stayed held; the file was not touched',
        hint: 'a parallel keyrack write holds the lock past the wait; retry. a lock dir older than 15s is stale, and is cleared on the next try',
      },
    },
    procedure,
  );
