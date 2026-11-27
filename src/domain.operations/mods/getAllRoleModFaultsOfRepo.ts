import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { getAllRoleModEntries } from '@src/domain.operations/mods/getAllRoleModEntries';
import { asRepoSlugKind } from '@src/domain.operations/role/asRepoSlugKind';
import { asRoleDir } from '@src/domain.operations/role/asRoleDir';
import { getAllLinkedRoleRefs } from '@src/domain.operations/role/getAllLinkedRoleRefs';

import { asRoleModFaultOrNull } from './asRoleModFaultOrNull';
import { asRoleModFaultsSortedByRole } from './asRoleModFaultsSortedByRole';
import { assertRoleModAppliable } from './assertRoleModAppliable';
import { getAllRoleModFaultsUncarried } from './getAllRoleModFaultsUncarried';
import { getAllRoleModSlugsUnplaced } from './getAllRoleModSlugsUnplaced';
import { getOneRoleModdedViewRecord } from './getOneRoleModdedViewRecord';
import { getOneRoleModHookBasis } from './getOneRoleModHookBasis';
import { getOneRoleModStateOrRefusal } from './getOneRoleModStateOrRefusal';
import { isRoleModdedViewRecordPresent } from './isRoleModdedViewRecordPresent';

/**
 * .what = run one fault check, and return its fault as a value, or naught
 * .why = each check is one mod's or one view's alone, so a fault is collected and the walk goes
 *        on; a code defect or an unclassed throw escapes loud
 *
 * .note = the same allowlist the boot gate holds (`asRoleModFaultOrNull`), so a fault the boot
 *   skips is the fault the stop names
 */
const getAllFaultsOfCheck = async (input: {
  role: string;
  check: () => unknown;
}): Promise<Array<{ role: string; error: Error }>> => {
  try {
    await input.check();
    return [];
  } catch (error: unknown) {
    const fault = asRoleModFaultOrNull({ error });
    if (!fault) throw error;
    return [{ role: input.role, error: fault }];
  }
};

/**
 * .what = the linked package roles whose modded view outlived its mod, with a record on disk
 * .why = such a view cannot return to published if its record is unreadable, so each is checked
 */
const getAllRefsOfOrphanViews = (input: {
  cwd: string;
  refsLinked: RoleLinkRef[];
  rolesNamed: Set<string>;
}): RoleLinkRef[] =>
  input.refsLinked.filter(
    (ref) =>
      asRepoSlugKind({ slug: ref.repo }) === 'package' &&
      !input.rolesNamed.has(ref.role) &&
      isRoleModdedViewRecordPresent({ cwd: input.cwd, ref }),
  );

/**
 * .what = the set of roles named by a mod slug or by an uncarried fault
 * .why = an orphan view is a role no mod and no uncarried fault already names
 */
const asRoleNamesUnion = (input: {
  slugs: string[];
  rolesUncarried: Set<string>;
}): Set<string> => new Set([...input.slugs, ...input.rolesUncarried]);

/**
 * .what = the mod slugs no uncarried fault already names
 * .why = a mod named at the repo grain is not read again per role
 */
const getAllSlugsLessUncarried = (input: {
  slugs: string[];
  rolesUncarried: Set<string>;
}): string[] => input.slugs.filter((slug) => !input.rolesUncarried.has(slug));

/**
 * .what = the faults of each orphan view's record, one per view whose record cannot be read
 */
const getAllFaultsOfOrphanViewRecords = async (input: {
  cwd: string;
  refsOfOrphanViews: RoleLinkRef[];
}): Promise<Array<{ role: string; error: Error }>> => {
  const faultsPerView = await Promise.all(
    input.refsOfOrphanViews.map((ref) =>
      getAllFaultsOfCheck({
        role: ref.role,
        check: () =>
          getOneRoleModdedViewRecord({
            roleDir: asRoleDir({ cwd: input.cwd, ref }),
          }),
      }),
    ),
  );
  return faultsPerView.flat();
};

/**
 * .what = every mod fault of the repo, read from the mods as they stand now
 * .why = the stop sweep holds a stop until each fault is cured (F02); it must never hold on a
 *        cured mod, so it reads the mod — its spec, its plan, its hook check, the kind dirs of its
 *        view, its record, and the mods path — and never the refusal the last render recorded,
 *        nor the boot gate, which names a cured mod stale until the next render
 *
 * .note = a stale view of a sound mod is no fault here: the next render heals it
 * .note = one fault per mod, its first; a role whose view record is corrupt and whose mod is
 *   gone is named by its record
 */
export const getAllRoleModFaultsOfRepo = async (
  _input: Record<string, never>,
  context: ContextCli,
): Promise<Array<{ role: string; error: Error }>> => {
  const cwd = context.cwd;

  // the faults no role carries: an unreadable mods path, a stray, a mod of no linked role
  const faultsUncarried = getAllRoleModFaultsUncarried({}, context);

  // the mod slugs those faults already read, by slug and never by fault key: a stray's key is
  //   its entry name, so a stray `foo` beside `role=foo` must not hide the mod's own fault
  const rolesUncarried = new Set(
    getAllRoleModSlugsUnplaced({}, context).slugsUnplaced,
  );

  // each mod a linked role of its slug carries, read as it stands
  const { slugs } = getAllRoleModEntries({ cwd });
  const refsLinked = getAllLinkedRoleRefs({}, context);

  // 🟡 .note = DELIBERATE MUTATION — the faults grow across the per-mod walk, which awaits the
  //   hook read one mod at a time; the list is scoped to this body and never escapes
  const faultsOfMods: Array<{ role: string; error: Error }> = [];
  for (const role of getAllSlugsLessUncarried({ slugs, rolesUncarried })) {
    const { state, refusal } = getOneRoleModStateOrRefusal({
      cwd,
      role,
      refsLinked,
    });
    if (refusal) {
      faultsOfMods.push({ role, error: refusal });
      continue;
    }

    // a plan that cannot apply refuses the view, by the one check the render also reads
    const faultsOfView = await getAllFaultsOfCheck({
      role,
      check: () =>
        assertRoleModAppliable(
          {
            state,
            hookBasis: getOneRoleModHookBasis({
              cwd,
              ref: state.target,
              plan: state.plan,
            }),
          },
          context,
        ),
    });
    faultsOfMods.push(...faultsOfView);
  }

  // a view whose mod is gone, with a record that cannot be read, cannot return to published
  const rolesNamed = asRoleNamesUnion({ slugs, rolesUncarried });
  const refsOfOrphanViews = getAllRefsOfOrphanViews({
    cwd,
    refsLinked,
    rolesNamed,
  });
  const faultsOfRecords = await getAllFaultsOfOrphanViewRecords({
    cwd,
    refsOfOrphanViews,
  });

  // one order on every host, the order the stop readout prints
  return asRoleModFaultsSortedByRole({
    faults: [...faultsUncarried, ...faultsOfMods, ...faultsOfRecords],
  });
};
