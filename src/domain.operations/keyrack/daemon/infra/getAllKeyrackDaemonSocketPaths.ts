import { readdirSync } from 'node:fs';
import { getHomeHash } from './getHomeHash';
import { getLoginSessionId } from './getLoginSessionId';

/**
 * .what = find all keyrack daemon socket paths for current session
 * .why = needed for --owner @all to prune all active daemons
 *
 * .note = socket path format: keyrack.$sessionId.$homeHash[.$owner].sock
 * .note = returns both default (no owner suffix) and owner-specific sockets
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

  // get session and home hash to match
  const sessionId = getLoginSessionId({ pid: process.pid });
  const homeHash = getHomeHash();

  // build prefix to match: keyrack.$sessionId.$homeHash
  const prefix = `keyrack.${sessionId}.${homeHash}`;

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

    // parse owner from filename
    // format: keyrack.$sessionId.$homeHash.sock (default)
    // format: keyrack.$sessionId.$homeHash.$owner.sock (with owner)
    const suffix = file.slice(prefix.length); // e.g., ".sock" or ".ehmpath.sock"

    let owner: string | null = null;
    if (suffix !== '.sock') {
      // has owner: ".ehmpath.sock" -> "ehmpath"
      // remove first "." and last ".sock"
      owner = suffix.slice(1, -5);
    }

    results.push({
      socketPath: `${runtimeDir}/${file}`,
      owner,
    });
  }

  return results;
};
