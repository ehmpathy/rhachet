import { getAllProcPidsNewestFirst } from './getAllProcPidsNewestFirst';
import { isSocketInodeHeldByProc } from './isSocketInodeHeldByProc';

/**
 * .what = the sync twin of getSocketInodeHolderPid — the pid that holds a fd on the socket with
 *   the given inode, or null
 * .why = the keyrack daemon's session gate is sync end to end (a memoized verdict read inside a
 *   sync data handler). it used `execSync('ss -xp')`, a map of every fd on the host: 2354ms on
 *   this box under cpu load, and past its 5s timeout under the full suite, so the gate refused
 *   every caller with "ss command failed" (measured 2026-10-23). this scan looks for one inode,
 *   newest process first, and stops at the first holder
 * .note = same skip rules as the async twin: an unreadable or gone process stays unfound, and
 *   the caller fails closed on null
 */
export const getSocketInodeHolderPidSync = (input: {
  inode: string;
}): number | null => {
  // our own process first — a peer in this process needs no scan
  if (isSocketInodeHeldByProc({ procDir: '/proc/self', inode: input.inode }))
    return process.pid;

  // then every pid, newest first, until the first holder
  return (
    getAllProcPidsNewestFirst().find((pid) =>
      isSocketInodeHeldByProc({ procDir: `/proc/${pid}`, inode: input.inode }),
    ) ?? null
  );
};
