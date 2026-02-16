import { existsSync, readFileSync, unlinkSync } from 'node:fs';

/**
 * .what = kill the keyrack daemon for test cleanup
 * .why = ensures tests use fresh daemon with current code
 *
 * .note = self-contained, no imports from src/ (blackbox principle)
 * .note = replicates socket path logic from getKeyrackDaemonSocketPath.ts
 */
export const killKeyrackDaemonForTests = (input?: {
  owner?: string | null;
}): { killed: boolean; pid: number | null } => {
  // get login session id from /proc/$PID/sessionid
  const sessionidPath = `/proc/${process.pid}/sessionid`;
  let sessionId: number;
  try {
    const content = readFileSync(sessionidPath, 'utf-8').trim();
    sessionId = parseInt(content, 10);
    if (Number.isNaN(sessionId)) {
      return { killed: false, pid: null };
    }
  } catch {
    return { killed: false, pid: null };
  }

  // construct socket path
  const uid = process.getuid?.();
  if (!uid) return { killed: false, pid: null };

  const runtimeDir = process.env['XDG_RUNTIME_DIR'] ?? `/run/user/${uid}`;
  const owner = input?.owner ?? null;
  const filename =
    owner === null
      ? `keyrack.${sessionId}.sock`
      : `keyrack.${sessionId}.${owner}.sock`;
  const socketPath = `${runtimeDir}/${filename}`;
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
