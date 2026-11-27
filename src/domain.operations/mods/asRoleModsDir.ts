import { join } from 'node:path';

/**
 * .what = the mods dir of a repo, `.agent/repo=.mods`
 * .why = every reader of the mods names one path, held in one place
 */
export const asRoleModsDir = (input: { cwd: string }): string =>
  join(input.cwd, '.agent', 'repo=.mods');
