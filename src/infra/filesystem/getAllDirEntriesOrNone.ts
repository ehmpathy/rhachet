import { readdirSync } from 'node:fs';
import { isErrnoEnoent } from './isErrnoEnoent';

/**
 * .what = the entries of a dir, sorted, or none where the dir is absent
 * .why = a dir may vanish between a probe and the read (a rename swap in flight); the read IS
 *        the check, so the vanish lands on the same branch as an absent dir. any other errno
 *        is real, and throws
 */
export const getAllDirEntriesOrNone = (input: { dir: string }): string[] => {
  try {
    return readdirSync(input.dir).sort();
  } catch (error: unknown) {
    if (isErrnoEnoent(error)) return [];
    throw error;
  }
};
