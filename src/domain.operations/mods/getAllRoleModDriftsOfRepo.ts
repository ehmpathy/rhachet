import type { ContextCli } from '@src/domain.objects/ContextCli';
import { getAllRoleModEntries } from '@src/domain.operations/mods/getAllRoleModEntries';
import { getAllLinkedRoleRefs } from '@src/domain.operations/role/getAllLinkedRoleRefs';

import { getAllRoleModDrifts } from './getAllRoleModDrifts';
import { getOneRoleModStateOrRefusal } from './getOneRoleModStateOrRefusal';

/**
 * .what = each mod in this repo pinned to a version other than the one installed
 * .why = an upgrade names each mod whose role it moved (usecase 5), so the human learns of it at
 *        the upgrade, not at the next boot; the stop sweep holds on the same drifts, so a clone
 *        that never boots the role learns too. the derivation lives here, so the cli layer only
 *        prints what it returns
 *
 * .note = a refused mod is no drift. its fault is the stop sweep's to name
 *   (`getAllRoleModFaultsOfRepo`), and the upgrade reads that same sweep, so one reader owns
 *   the fault set
 * .note = an unmodded repo scans no linked role and reads no package
 */
export const getAllRoleModDriftsOfRepo = (
  _input: Record<string, never>,
  context: ContextCli,
): {
  drifts: ReturnType<typeof getAllRoleModDrifts>;
} => {
  const cwd = context.cwd;
  const { slugs } = getAllRoleModEntries({ cwd });
  if (slugs.length === 0) return { drifts: [] };

  // each mod's state, or the refusal that stops it
  const refsLinked = getAllLinkedRoleRefs({}, context);
  const verdicts = slugs.map((role) => ({
    role,
    ...getOneRoleModStateOrRefusal({ cwd, role, refsLinked }),
  }));

  return { drifts: getAllRoleModDrifts({ cwd, verdicts }) };
};
