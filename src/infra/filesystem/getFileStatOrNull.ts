import { lstatSync, type Stats } from 'node:fs';
import { isErrnoEnoent } from './isErrnoEnoent';

/**
 * .what = lstat a path, or null when no entry is at the path
 * .why = lstat, not stat: a dangled symlink is still an entry, and a caller that
 *        must retire a leftover link has to see it
 *
 * .note = only ENOENT maps to null; every other error surfaces
 */
export const getFileStatOrNull = (input: { path: string }): Stats | null => {
  try {
    return lstatSync(input.path);
  } catch (error) {
    if (isErrnoEnoent(error)) return null;
    throw error;
  }
};
