import { asKeyrackDaemonPidPath } from '@src/domain.operations/keyrack/daemon/infra/asKeyrackDaemonPidPath';
import { delFileSync } from '@src/domain.operations/keyrack/daemon/infra/delFileSync';
import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';

import { readFileSync } from 'node:fs';

/**
 * .what = kill the keyrack daemon if active
 * .why = needed for restart after code changes or explicit cleanup
 *
 * .note = reads pid from .pid file, sends SIGTERM
 * .note = cleans up socket and pid files
 */
export const killKeyrackDaemon = (input?: {
  socketPath?: string;
  owner?: string | null;
}): { killed: boolean; pid: number | null } => {
  // resolve socket path
  const socketPath =
    input?.socketPath ?? getKeyrackDaemonSocketPath({ owner: input?.owner });
  const pidPath = asKeyrackDaemonPidPath({ socketPath });

  // read pid
  // .note = no existsSync guard ahead of this read, deliberately. existsSync
  // swallows every stat error, so an EACCES on the pid file would return "no
  // daemon here" from the guard and the allowlist below would never see it —
  // the exact failhide this catch exists to close, moved one line earlier. the
  // read's own ENOENT branch reports absence, and it reports it honestly
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
    // .why = EACCES here means a pid file this uid may not read — a live daemon owned
    // by another user. to report that as { killed: false, pid: null } tells the caller
    // no daemon is present, so `daemon prune` would count it reaped while it stays
    // alive, and the caller would never learn a real daemon outlived the prune
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return { killed: false, pid: null };
  }

  // try to kill the process
  try {
    process.kill(pid, 'SIGTERM');
  } catch (error) {
    // allow expected errors: ESRCH = no such process (already dead)
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
  }

  // cleanup files
  delFileSync({ path: socketPath });
  delFileSync({ path: pidPath });

  return { killed: true, pid };
};
