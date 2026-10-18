import { withRepoMutex } from '@src/infra/lock/withRepoMutex';

/**
 * .what = run a procedure while it holds this repo's mutex over one keyrack manifest file
 * .why = a read-edit-write of keyrack.yml races a parallel `keyrack set`, `del`, or
 *   init; inside the mutex, the second writer reads the first writer's file
 * .note = the mutex is `withRepoMutex`, the one lock protocol in rhachet, keyed on the
 *   manifest's path; its keys live in the repo's gitignored `.agent/.actors/.locks/`
 */
export const withKeyrackManifestWriteLock = <T>(
  input: { gitroot: string; path: string },
  procedure: () => T | Promise<T>,
): Promise<T> =>
  withRepoMutex({ repoPath: input.gitroot, path: input.path }, async () =>
    procedure(),
  );
