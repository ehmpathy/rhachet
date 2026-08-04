import { readdirSync } from 'node:fs';
import { getLoginSessionId } from './getLoginSessionId';

/**
 * .what = find all keyrack daemon socket paths in the caller's login session
 * .why = needed for --owner @all to prune all active daemons
 *
 * .note = socket path format: keyrack.$sessionId.$homeHash[.$owner].sock
 * .note = returns both default (no owner suffix) and owner-specific sockets
 * .note = spans every homeHash in the session, but stays within the session. cross-session
 *         access is refused elsewhere (verifyCallerLoginSession), and to reap another
 *         session's daemons would silently drop that session's cached credentials
 */
export const getAllKeyrackDaemonSocketPaths = (): {
  socketPath: string;
  owner: string | null;
}[] => {
  // guard: getuid only available on POSIX (linux)
  if (typeof process.getuid !== 'function') {
    return [];
  }

  // get runtime dir
  const uid = process.getuid();
  const runtimeDir = process.env['XDG_RUNTIME_DIR'] ?? `/run/user/${uid}`;

  // get session to match
  const sessionId = getLoginSessionId({ pid: process.pid });

  // build prefix to match: keyrack.$sessionId.
  // .why = the homeHash segment is deliberately NOT pinned. HOME is caller-set, so a
  // caller that mints a temp HOME mints a fresh homeHash and a fresh daemon; a
  // divergent homeHash IS the leak. to pin the pruner's own homeHash is to search
  // the one shelf the leaked daemons are never filed under.
  // .note = the dot at the end matters: it stops session 3 from a match on session 34
  const prefix = `keyrack.${sessionId}.`;

  // list files in runtime dir
  let files: string[];
  try {
    files = readdirSync(runtimeDir);
  } catch (error) {
    // allow expected errors: ENOENT/EACCES = runtime dir doesn't exist or not readable
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'EACCES') return [];
    throw error;
  }

  // filter to matched socket files
  const results: { socketPath: string; owner: string | null }[] = [];

  for (const file of files) {
    // must start with prefix and end with .sock
    if (!file.startsWith(prefix) || !file.endsWith('.sock')) continue;

    // parse homeHash + owner from the tail
    // format: keyrack.$sessionId.$homeHash.sock (default)
    // format: keyrack.$sessionId.$homeHash.$owner.sock (with owner)
    const tail = file.slice(prefix.length, -'.sock'.length); // e.g. "a1b2c3d4" or "a1b2c3d4.mechanic"
    const [homeHash, ...ownerParts] = tail.split('.');

    // skip malformed names; homeHash is always 8 hex chars (see getHomeHash)
    // .why = the widened prefix now admits any tail, so shape must be verified here
    if (!homeHash || !/^[0-9a-f]{8}$/.test(homeHash)) continue;

    // all segments after the homeHash form the owner
    // .note = rejoined, not just the first. owner reaches the filename unsanitized
    // (getKeyrackDaemonSocketPath interpolates it as given), so a dot in an owner is
    // expressible; to read only the first segment would hide that daemon from prune
    const owner = ownerParts.length > 0 ? ownerParts.join('.') : null;

    results.push({
      socketPath: `${runtimeDir}/${file}`,
      owner,
    });
  }

  // sort by socket path, so the order is the same on every host and every run
  // .why = readdirSync returns whatever order the filesystem hands back. `daemon
  // prune --owner @all` prints one line per daemon in exactly this order, so an
  // unsorted list makes that output unpinnable — no snapshot can hold it, and two
  // runs on one machine can disagree. this branch is what makes that list long
  // enough for the order to be noticed
  return results.sort((a, b) => a.socketPath.localeCompare(b.socketPath));
};
