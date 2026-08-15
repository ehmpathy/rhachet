import { getHomeHash } from '@src/infra/host/getHomeHash';

/**
 * .what = derive the unix domain socket path for one clone, or null on a host
 *   that cannot carry a unix socket
 * .why =
 *   - the socket is host-scoped runtime: it lives under $XDG_RUNTIME_DIR (per-user,
 *     tmpfs, 0700) — NOT in the clone dir — so a repo read on another host never
 *     trusts a foreign socket path. the serial keys it (a uuid, globally unique),
 *     and the home hash isolates per-HOME and lets a cross-host reach be detected
 *   - the path is DERIVED fresh from the serial every time, so a moved repo never
 *     carries a stale socket path (the socket dir does not travel with the repo)
 *
 * .note = returns null on a non-POSIX host (no process.getuid) — a unix socket
 *   cannot be stood up there, so the caller falls back to a plain spawn (no
 *   socket). this is an EXPECTED condition, not an error — never a hard throw
 * .note = format: `$XDG_RUNTIME_DIR/clone.<serial>.<homeHash>.sock`. serial(36) +
 *   homeHash(8) keeps the whole path well under the ~104-char unix-socket limit
 */
export const getCloneSocketPath = (input: {
  serial: string;
}): string | null => {
  // a unix socket needs a POSIX runtime dir keyed by uid — absent on non-POSIX
  if (typeof process.getuid !== 'function') return null;

  const uid = process.getuid();
  const runtimeDir = process.env['XDG_RUNTIME_DIR'] ?? `/run/user/${uid}`;

  // per-HOME isolation + cross-host detection (the shared host-identity digest)
  const homeHash = getHomeHash();

  return `${runtimeDir}/clone.${input.serial}.${homeHash}.sock`;
};
