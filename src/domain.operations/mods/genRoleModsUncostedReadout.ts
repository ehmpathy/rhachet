import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { asRoleDir } from '@src/domain.operations/role/asRoleDir';

import { relative } from 'node:path';
import { asRoleModsUncostedReadout } from './asRoleModsUncostedReadout';
import { getAllModdedRoleRefsUnbootable } from './getAllModdedRoleRefsUnbootable';
import { getAllModdedRoleRefsWithoutBootSpec } from './getAllModdedRoleRefsWithoutBootSpec';
import { getAllRoleModSlugsUnplaced } from './getAllRoleModSlugsUnplaced';

/**
 * .what = the readout of every modded role the cost sweep could not price
 * .why = a modded role with no row in the roster is named apart (usecase 4); the derivation
 *        lives here, so the cli layer only prints the lines
 *
 * .note = a role the roster already priced is named by its row's mark, never a second time
 * .note = `withheld` counts the stale and refused roles: their spec sits on a swept path, so the
 *   sweep found it and did not price it
 * .note = `roleDirsPriced` are the dirs of the roster's specs; both sides compare repo-relative
 */
export const genRoleModsUncostedReadout = (
  input: { roleDirsPriced: string[] },
  context: ContextCli,
): { lines: string[]; withheld: number } => {
  const cwd = context.cwd;
  const roleDirsPriced = input.roleDirsPriced.map((dir) => relative(cwd, dir));
  const isRefUnpriced = (ref: RoleLinkRef): boolean =>
    !roleDirsPriced.includes(relative(cwd, asRoleDir({ cwd, ref })));
  const unbootable = getAllModdedRoleRefsUnbootable({}, context);
  const refsStale = unbootable.stale.filter(isRefUnpriced);
  const refsRefused = unbootable.refused.filter(isRefUnpriced);
  const lines = asRoleModsUncostedReadout({
    refsWithoutSpec: getAllModdedRoleRefsWithoutBootSpec({}, context),
    refsStale,
    refsRefused,
    ...getAllRoleModSlugsUnplaced({}, context),
  });

  // a stale or refused role's spec was found and withheld from the price, so the summary
  //   must not call it absent
  return { lines, withheld: refsStale.length + refsRefused.length };
};
