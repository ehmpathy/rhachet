import { readFileSync, unlinkSync } from 'node:fs';

import { getKeyrackDaemonSocketPathForTests } from './getKeyrackDaemonSocketPathForTests';

/**
 * .what = kill the keyrack daemon for test cleanup
 * .why = ensures tests use fresh daemon with current code
 *
 * .note = self-contained, no imports from src/ (blackbox principle)
 */
export const killKeyrackDaemonForTests = (input?: {
  owner?: string | null;
}): { killed: boolean; pid: number | null } => {
  const socketPath = getKeyrackDaemonSocketPathForTests(input);
  if (!socketPath) return { killed: false, pid: null };
  const pidPath = socketPath.replace(/\.sock$/, '.pid');

  // read pid
  // .note = no existsSync guard ahead of this read, deliberately. existsSync
  // swallows every stat error, so an EACCES on the pid file would return "no
  // daemon here" from the guard and the allowlist below would never see it.
  // mirrors killKeyrackDaemon, whose parity with this replica is clamped by
  // killKeyrackDaemon.integration.test.ts
  let pid: number;
  try {
    const pidStr = readFileSync(pidPath, 'utf-8').trim();
    pid = parseInt(pidStr, 10);
    if (isNaN(pid)) {
      return { killed: false, pid: null };
    }
  } catch (error) {
    // allow expected errors: ENOENT = the daemon unlinked its own pid file just
    // before this read. that race is normal and benign — it means no daemon
    // .why = EACCES here means a pid file owned by another uid, which is a real
    // fault this cleanup must surface rather than report as "no daemon to kill"
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return { killed: false, pid: null };
  }

  // try to kill the process
  try {
    process.kill(pid, 'SIGTERM');
  } catch (error) {
    // allow expected errors: ESRCH = the daemon already died and left a stale pid file
    // .why = EPERM means a live process this uid may not signal — a pid recycled onto
    // someone else's process. to swallow that would report killed: true for a daemon
    // still very much alive, so the caller's next test runs against stale code
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
  }

  // cleanup files
  // .why = each unlink allows only ENOENT (raced with the daemon's own exit-path
  // cleanup, which is idempotent by design). EACCES/EBUSY leave a file behind that
  // the next run would mistake for a live daemon, so they must fail loud
  try {
    unlinkSync(socketPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  try {
    unlinkSync(pidPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  return { killed: true, pid };
};
