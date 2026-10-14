import { randomBytes } from 'node:crypto';
import { renameSync, rmSync, symlinkSync } from 'node:fs';

/**
 * .what = point a symlink at a new target in one step: a fresh link beside it, renamed over it
 * .why = an unlink then a symlink leaves a window where the name does not exist, and a
 *        concurrent reader (a bare `claude`) would meet ENOENT. `rename(2)` replaces the entry
 *        itself, never what it points at, and is atomic on POSIX
 * .note = the swap name carries the pid and a random suffix, so two writers never share one
 * .note = a rename that fails (e.g. a dir holds the name) drops the swap link before it
 *   rethrows, so no orphan `.swap.*` entry is left behind
 */
export const setSymlinkSwapped = (input: {
  path: string;
  target: string;
}): void => {
  const pathSwap = `${input.path}.swap.${process.pid}.${randomBytes(4).toString('hex')}`;
  symlinkSync(input.target, pathSwap);
  try {
    renameSync(pathSwap, input.path);
  } catch (error) {
    rmSync(pathSwap, { force: true });
    throw error;
  }
};
