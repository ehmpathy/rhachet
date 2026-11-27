import { realpathSync } from 'node:fs';
import { join } from 'node:path';
import { withFileMutex } from './withFileMutex';

/**
 * .what = run an async section while this repo's mutex over one file is held, so two `rhx`
 *   processes (or two call chains of one) that write the file take turns
 * .why = a file inside a repo (a brain dir, a settings file) is shared by every `rhx` call in
 *   that repo, so the repo is the lock scope
 *
 * .note = the keys live at `<repo>/.agent/.actors/.locks/` by default. the actors root
 *   (`getActorsRootDir`) is ignored by git, and the dir also writes its own `*` ignore, so no
 *   key file ever shows in `git status`, even before `rhx init` writes the actors ignore. the
 *   literal is restated here because infra may not import a domain operation
 * .note = the repo is keyed by realpath, so a symlink or worktree hop never splits one repo into
 *   two scopes
 * .note = rides `withFileMutex`, the one owner of `with-simple-mutex` (inventory.of=requirements.case=6)
 * .note = NOT reentrant, same as `withFileMutex`
 */
export const withRepoMutex = async <T>(
  input: {
    repoPath: string;
    path: string;
    /** the wait bound; default two minutes */
    waitMs?: number;
    /** the lease; default five minutes. a test shortens it to prove a lapsed hold is retaken */
    leaseMs?: number;
    /** where the mutex keys live; default `<repo>/.agent/.actors/.locks/` */
    locksDir?: string;
  },
  logic: () => Promise<T>,
): Promise<T> =>
  withFileMutex(
    {
      root: input.repoPath,
      path: input.path,
      waitMs: input.waitMs,
      leaseMs: input.leaseMs,
      locksDir:
        input.locksDir ??
        join(realpathSync(input.repoPath), '.agent', '.actors', '.locks'),
    },
    logic,
  );
