import { getAllProcPidsNewestFirst } from './getAllProcPidsNewestFirst';
import { isSocketInodeHeldByProc } from './isSocketInodeHeldByProc';

/**
 * .what = the pid of a process that holds a fd on the socket with the given inode, or null
 * .why =
 *   - the clone socket's auth needs the PEER's owner. `ss -xp` answers that by a map of every
 *     fd of every process on the host, once per connection — 168–343ms idle on a dev box, and
 *     past a probe's 1s reply bound under suite load, so the client hung up mid-auth and the
 *     lookup then found no owner (measured 2026-10-23)
 *   - this looks for ONE inode and stops at the first holder: our own process first (a peer in
 *     this process), then each process from the most recently started down — a caller is most
 *     often a process that just started, so the scan usually ends within a few pids
 *
 * .note = a process this user may not read (EACCES), or one that exits mid-scan (ENOENT), is
 *   skipped: such a holder stays unfound, and the caller fails closed on null. that is the
 *   same reach `ss -p` has as a non-root user, so no peer is admitted that `ss` would refuse
 * .note = the /proc reads are sync (microseconds each); the scan yields to the event loop
 *   every few pids, so a long scan never stalls the clone's pty mirror. a caller that is sync
 *   end to end (the keyrack daemon's session gate) uses getSocketInodeHolderPidSync
 */
export const getSocketInodeHolderPid = async (input: {
  inode: string;
}): Promise<number | null> => {
  // our own process first — a peer in this process needs no scan
  if (isSocketInodeHeldByProc({ procDir: '/proc/self', inode: input.inode }))
    return process.pid;

  // then every pid, newest first, with a yield every 32 pids
  for (const [index, pid] of getAllProcPidsNewestFirst().entries()) {
    if (index > 0 && index % 32 === 0)
      await new Promise<void>((done) => setImmediate(done));
    if (
      isSocketInodeHeldByProc({ procDir: `/proc/${pid}`, inode: input.inode })
    )
      return pid;
  }

  return null;
};
