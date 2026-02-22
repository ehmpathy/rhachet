import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';

import { existsSync, readFileSync, unlinkSync } from 'node:fs';

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
  const pidPath = socketPath.replace(/\.sock$/, '.pid');

  // check if pid file exists
  if (!existsSync(pidPath)) {
    return { killed: false, pid: null };
  }

  // read pid
  let pid: number;
  try {
    const pidStr = readFileSync(pidPath, 'utf-8').trim();
    pid = parseInt(pidStr, 10);
    if (isNaN(pid)) {
      return { killed: false, pid: null };
    }
  } catch {
    return { killed: false, pid: null };
  }

  // try to kill the process
  try {
    process.kill(pid, 'SIGTERM');
  } catch (error) {
    // ESRCH = no such process (already dead)
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
      // ignore other errors, continue cleanup
    }
  }

  // cleanup files
  try {
    if (existsSync(socketPath)) unlinkSync(socketPath);
  } catch {
    // ignore cleanup errors
  }
  try {
    if (existsSync(pidPath)) unlinkSync(pidPath);
  } catch {
    // ignore cleanup errors
  }

  return { killed: true, pid };
};
