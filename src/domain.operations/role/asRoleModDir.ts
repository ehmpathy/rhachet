import { join } from 'node:path';

/**
 * .what = the dir of one role's mod, `.agent/repo=.mods/role=<role>/`
 * .why = the mods layout is named in one place, so neither the mods sync nor the hook sync
 *        derives it by hand
 */
export const asRoleModDir = (input: { cwd: string; role: string }): string =>
  join(input.cwd, '.agent', 'repo=.mods', `role=${input.role}`);
