import { sep } from 'node:path';

/**
 * .what = the `{ cwd, repo, role }` a `.agent/repo=X/role=Y` dir path names, or null
 * .why = a role dir's own coordinates name the role, so a reader of the path needs no field of
 *        its own; the regex groups read by name here, never by position at the call site
 *
 * .note = the path is posix-normalized before the match, so a host that joins with a backslash
 *   still matches; the returned `cwd` is posix too
 * .note = a path outside `.agent/repo=*\/role=*` (a manifest, a registry role) returns null
 */
export const asRoleDirCoordinates = (input: {
  roleDir: string;
}): { cwd: string; repo: string; role: string } | null => {
  const roleDirPosix = input.roleDir.split(sep).join('/');
  const match = roleDirPosix.match(
    /^(?<cwd>.*)\/\.agent\/repo=(?<repo>[^/]+)\/role=(?<role>[^/]+)\/?$/,
  );
  const cwd = match?.groups?.cwd;
  const repo = match?.groups?.repo;
  const role = match?.groups?.role;
  if (!cwd || !repo || !role) return null;
  return { cwd, repo, role };
};
