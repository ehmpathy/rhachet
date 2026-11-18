import { asRoleModDir } from '@src/domain.operations/role/asRoleModDir';

import { existsSync } from 'node:fs';

/**
 * .what = whether `.agent/repo=.mods/role=<role>/` is on disk
 * .why = a boot reads the mod spec only where a mod of its slug exists, so an unmodded repo
 *        pays no parse and no scan
 */
export const isRoleModDirPresent = (input: {
  cwd: string;
  role: string;
}): boolean => existsSync(asRoleModDir(input));
