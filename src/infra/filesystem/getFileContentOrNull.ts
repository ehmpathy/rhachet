import { readFileSync } from 'node:fs';
import { isErrnoEnoent } from './isErrnoEnoent';

/**
 * .what = read a file as utf-8, or null when no file is at the path
 * .why = "read it if present" is the one shape the login checks need, and one read
 *        per decision leaves no gap between an existence check and the read
 *
 * .note = only ENOENT maps to null; every other error (EACCES, EISDIR) surfaces
 * .note = a path through a dangled symlink reads as null, like an absent file
 */
export const getFileContentOrNull = (input: {
  path: string;
}): string | null => {
  try {
    return readFileSync(input.path, 'utf-8');
  } catch (error) {
    if (isErrnoEnoent(error)) return null;
    throw error;
  }
};
