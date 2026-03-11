import glob from 'fast-glob';

import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = discovers role keyracks via glob pattern in .agent/ directory
 * .why = enables auto-population of extends array in repo keyrack manifest
 *
 * searches for: `.agent/repo=STAR/role=STAR/keyrack.yml` (where STAR = wildcard)
 * filters to: only keyracks for specified roles
 * returns: sorted array of relative paths (e.g., `.agent/repo=ehmpathy/role=mechanic/keyrack.yml`)
 */
export const discoverRoleKeyracks = async (
  input: { roles: string[] },
  context: { gitroot: string },
): Promise<string[]> => {
  // check if .agent directory exists
  const dirAgent = join(context.gitroot, '.agent');
  if (!existsSync(dirAgent)) return [];

  // glob for role keyracks
  const allPaths = await glob('.agent/repo=*/role=*/keyrack.yml', {
    cwd: context.gitroot,
    onlyFiles: true,
  });

  // filter to only specified roles
  const rolesSet = new Set(input.roles);
  const filteredPaths = allPaths.filter((path) => {
    // extract role from path: .agent/repo=X/role=Y/keyrack.yml -> Y
    const match = path.match(/role=([^/]+)/);
    if (!match) return false;
    const role = match[1];
    if (!role) return false;
    return rolesSet.has(role);
  });

  // sort alphabetically for deterministic output
  return filteredPaths.sort();
};
