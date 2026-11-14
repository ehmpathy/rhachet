import type { ContextCli } from '@src/domain.objects/ContextCli';
import { getAllLinkedRoleRefs } from '@src/domain.operations/role/getAllLinkedRoleRefs';
import { getAllRoleModEntries } from '@src/domain.operations/role/getAllRoleModEntries';

import { asRoleModStrayEntryError } from './asRoleModStrayEntryError';
import { getAllRoleModDrifts } from './getAllRoleModDrifts';
import { getOneRoleModStateOrRefusal } from './getOneRoleModStateOrRefusal';

/**
 * .what = each mod in this repo pinned to a version other than the one installed, and each mod
 *         that no longer applies
 * .why = an upgrade names each mod whose role it moved (usecase 5), and each mod the new
 *        release refuses, so the human learns of it at the upgrade, not at the next boot; the
 *        derivation lives here, so the cli layer only prints what it returns
 *
 * .note = a refusal is returned as a value, never thrown: the upgrade already landed, so a
 *   report of what it found must not read as a failed upgrade
 * .note = a stray entry under `.agent/repo=.mods/` is one more refusal, for the same reason
 * .note = an unmodded repo scans no linked role and reads no package
 */
export const getAllRoleModDriftsOfRepo = (
  _input: Record<string, never>,
  context: ContextCli,
): {
  drifts: ReturnType<typeof getAllRoleModDrifts>;
  refusals: Array<{ role: string | null; error: Error }>;
} => {
  const cwd = context.cwd;
  const { modsDir, slugs, strays } = getAllRoleModEntries({ cwd });
  const refusalsOfStrays = strays.map((entry) => ({
    role: null,
    error: asRoleModStrayEntryError({ modsDir, entry }),
  }));
  if (slugs.length === 0) return { drifts: [], refusals: refusalsOfStrays };

  // each mod's state, or the refusal that stops it
  const refsLinked = getAllLinkedRoleRefs({}, context);
  const verdicts = slugs.map((role) => ({
    role,
    ...getOneRoleModStateOrRefusal({ cwd, role, refsLinked }),
  }));
  const refusalsOfMods = verdicts.flatMap(({ role, refusal }) =>
    refusal ? [{ role, error: refusal }] : [],
  );

  return {
    drifts: getAllRoleModDrifts({ cwd, verdicts }),
    refusals: [...refusalsOfStrays, ...refusalsOfMods],
  };
};
