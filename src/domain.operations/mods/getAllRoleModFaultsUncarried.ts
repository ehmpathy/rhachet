import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { getAllRoleModEntries } from '@src/domain.operations/mods/getAllRoleModEntries';
import { getAllLinkedRoleRefs } from '@src/domain.operations/role/getAllLinkedRoleRefs';

import { getAllRoleModFaultsOfModsDir } from './getAllRoleModFaultsOfModsDir';
import { getAllRoleModSlugsUnplaced } from './getAllRoleModSlugsUnplaced';
import { getOneRoleModStateOrRefusal } from './getOneRoleModStateOrRefusal';

/**
 * .what = the refusal of each unplaced mod slug whose own state refuses
 * .why = with no role of its slug linked, a mod is a fault only where its target lookup refuses
 */
const getAllFaultsOfUnplacedSlugs = (input: {
  cwd: string;
  slugsUnplaced: string[];
  refsLinked: RoleLinkRef[];
}): Array<{ role: string; error: Error }> =>
  input.slugsUnplaced.flatMap((role) => {
    const { refusal } = getOneRoleModStateOrRefusal({
      cwd: input.cwd,
      role,
      refsLinked: input.refsLinked,
    });
    return refusal ? [{ role, error: refusal }] : [];
  });

/**
 * .what = each mod fault no role can carry: a mods path that cannot be read (C13), a stray entry
 *         (C0), and a mod no linked role of its slug carries (the repo split of C3)
 * .why = such a fault has no role section to name it, so the boot names it once, at the tail of
 *        boot.md; a clone that never sees it would work beside a mod it was never told is off
 *
 * .note = each fault is read as the mods stand, so a cure clears it at the next render
 * .note = a mod no linked role carries is a fault only where its own state refuses; with no role
 *   of its slug linked, its target lookup is what refuses
 */
export const getAllRoleModFaultsUncarried = (
  _input: Record<string, never>,
  context: ContextCli,
): Array<{ role: string; error: Error }> => {
  const { modsDir, fault } = getAllRoleModEntries({ cwd: context.cwd });
  const { slugsUnplaced, entriesStray } = getAllRoleModSlugsUnplaced(
    {},
    context,
  );
  const refsLinked =
    slugsUnplaced.length > 0 ? getAllLinkedRoleRefs({}, context) : [];
  return [
    ...getAllRoleModFaultsOfModsDir({ modsDir, fault, strays: entriesStray }),
    ...getAllFaultsOfUnplacedSlugs({
      cwd: context.cwd,
      slugsUnplaced,
      refsLinked,
    }),
  ];
};
