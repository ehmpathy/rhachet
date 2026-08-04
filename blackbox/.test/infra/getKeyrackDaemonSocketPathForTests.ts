import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';

/**
 * .what = build the daemon socket path this session's daemon would own
 * .why = exported so a src-side test can assert it still equals what
 *        getKeyrackDaemonSocketPath produces. this is a deliberate replica
 *        (blackbox tests import no src), and a replica with no conformance check
 *        is a replica that drifts — which is exactly how it went dead before
 *
 * .note = self-contained, no imports from src/ (blackbox principle)
 * .note = replicates socket path logic from getKeyrackDaemonSocketPath.ts
 * .note = returns null when the shape cannot be built (no session id, no uid)
 */
export const getKeyrackDaemonSocketPathForTests = (input?: {
  owner?: string | null;
}): string | null => {
  // get login session id from /proc/$PID/sessionid
  const sessionidPath = `/proc/${process.pid}/sessionid`;
  let sessionId: number;
  try {
    const content = readFileSync(sessionidPath, 'utf-8').trim();
    sessionId = parseInt(content, 10);
    if (Number.isNaN(sessionId)) return null;
  } catch (error) {
    // allow expected errors: no /proc at all (non-linux) or no sessionid under it
    // .why = both mean "this host has no login-session identity", which is the one
    // case this null is for. every other code (EACCES on a locked-down /proc, EIO on
    // a broken mount) is a real fault, and to swallow it would make this replica
    // silently return null on a host where the daemon does build a path — the exact
    // silent no-op that made this whole cleanup dead before
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT' && code !== 'ENOTDIR') throw error;
    return null;
  }

  const uid = process.getuid?.();
  if (!uid) return null;

  const runtimeDir = process.env['XDG_RUNTIME_DIR'] ?? `/run/user/${uid}`;

  // compute the homeHash segment
  // .why = the socket path has carried a homeHash since daemon identity was keyed to
  // HOME. this replica omitted it, so every path it built was a shape the daemon never
  // produces — which made the whole cleanup a silent no-op that no test could notice
  const homePath = process.env['HOME'] ?? process.cwd();
  const homeHash = createHash('sha256')
    .update(realpathSync(homePath))
    .digest('hex')
    .slice(0, 8);

  // treat 'default' as null, exactly as the path builder does
  // .why = getKeyrackDaemonSocketPath folds 'default' into null, so a caller who
  // passes 'default' here would otherwise build a `.default.sock` path the daemon
  // never produces — the same silent no-op that made this whole cleanup dead
  const ownerRaw = input?.owner ?? null;
  const owner = ownerRaw === 'default' ? null : ownerRaw;
  const filename =
    owner === null
      ? `keyrack.${sessionId}.${homeHash}.sock`
      : `keyrack.${sessionId}.${homeHash}.${owner}.sock`;
  return `${runtimeDir}/${filename}`;
};
