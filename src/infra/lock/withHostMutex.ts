import { join } from 'node:path';
import { withFileMutex } from './withFileMutex';

/**
 * .what = run an async section while this host's mutex over one file is held, so every `rhx`
 *   process on the box that writes the file takes turns, whatever repo it runs in
 * .why = a file under the home dir (e.g., the keyrack host manifest) is shared by every repo on
 *   the box, so a per-repo lock scope would let two repos write it at once
 *
 * .note = the keys live at `<home>/.rhachet/.locks/`; the key is the file's path relative to home
 * .note = rides `withFileMutex`, the one owner of `with-simple-mutex` (inventory.of=requirements.case=6),
 *   so the lease, the wait bound and the wait notice are the same contract, at their defaults
 * .note = NOT reentrant, same as `withFileMutex`
 */
export const withHostMutex = async <T>(
  input: { home: string; path: string },
  logic: () => Promise<T>,
): Promise<T> =>
  withFileMutex(
    {
      root: input.home,
      path: input.path,
      locksDir: join(input.home, '.rhachet', '.locks'),
    },
    logic,
  );
