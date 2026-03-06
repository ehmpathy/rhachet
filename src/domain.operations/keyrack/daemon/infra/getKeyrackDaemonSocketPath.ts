import { UnexpectedCodePathError } from 'helpful-errors';

import { getHomeHash } from './getHomeHash';
import { getLoginSessionId } from './getLoginSessionId';

/**
 * .what = compute the unix domain socket path for the keyrack daemon
 * .why = socket path includes session id and home hash for isolation
 *
 * .note = uses XDG_RUNTIME_DIR which is:
 *   - per-user
 *   - tmpfs (dies on reboot)
 *   - proper permissions (0700)
 *
 * .note = socket path format: $XDG_RUNTIME_DIR/keyrack.$SESSIONID.$HOMEHASH.sock (default)
 * .note = socket path format: $XDG_RUNTIME_DIR/keyrack.$SESSIONID.$HOMEHASH.$owner.sock (per-owner)
 * .note = falls back to /run/user/$UID if XDG_RUNTIME_DIR is unset
 */
export const getKeyrackDaemonSocketPath = (input?: {
  owner?: string | null;
}): string => {
  // guard: getuid only available on POSIX (linux)
  if (typeof process.getuid !== 'function') {
    throw new UnexpectedCodePathError(
      'keyrack daemon requires POSIX (linux) — process.getuid is unavailable',
      { platform: process.platform },
    );
  }

  // get XDG_RUNTIME_DIR or fallback
  const uid = process.getuid();
  const runtimeDir = process.env['XDG_RUNTIME_DIR'] ?? `/run/user/${uid}`;

  // get login session id for current process
  const sessionId = getLoginSessionId({ pid: process.pid });

  // validate runtime dir is set
  if (!runtimeDir) {
    throw new UnexpectedCodePathError(
      'XDG_RUNTIME_DIR is unset and fallback failed',
      { uid },
    );
  }

  // get home hash for per-HOME isolation
  const homeHash = getHomeHash();

  // construct socket path with optional owner suffix
  const owner = input?.owner ?? null;
  const filename =
    owner === null
      ? `keyrack.${sessionId}.${homeHash}.sock`
      : `keyrack.${sessionId}.${homeHash}.${owner}.sock`;
  return `${runtimeDir}/${filename}`;
};
