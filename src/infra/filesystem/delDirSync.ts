import { rmdirSync } from 'node:fs';
import { isErrnoEnoent } from './isErrnoEnoent';

/**
 * .what = remove an empty dir; a no-op when the dir is already gone
 * .why = a lock dir may be removed by a peer between a check and the removal;
 *   a dir already gone is the goal met, never a fault
 *
 * .note = only ENOENT is allowed; a dir with content (ENOTEMPTY) or any other
 *   error surfaces
 */
export const delDirSync = (input: { path: string }): void => {
  try {
    rmdirSync(input.path);
  } catch (error) {
    if (isErrnoEnoent(error)) return;
    throw error;
  }
};
