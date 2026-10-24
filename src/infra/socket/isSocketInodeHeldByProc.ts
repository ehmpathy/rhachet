import { readdirSync, readlinkSync } from 'node:fs';
import { isSkippableProcError } from './isSkippableProcError';

/**
 * .what = does any fd of this process link to the target socket inode?
 * .why = one process's check, apart from the walk; an unreadable or gone process reads false
 */
export const isSocketInodeHeldByProc = (input: {
  procDir: string;
  inode: string;
}): boolean => {
  const target = `socket:[${input.inode}]`;
  const fds = (() => {
    try {
      return readdirSync(`${input.procDir}/fd`);
    } catch (error) {
      // a process gone mid-scan, or another user's, is not the holder we can prove
      if (isSkippableProcError(error)) return [];
      throw error;
    }
  })();
  return fds.some((fd) => {
    try {
      return readlinkSync(`${input.procDir}/fd/${fd}`) === target;
    } catch (error) {
      // a fd closed between the list and the read
      if (isSkippableProcError(error)) return false;
      throw error;
    }
  });
};
