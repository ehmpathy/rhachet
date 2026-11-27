import type { HelpfulError } from 'helpful-errors';

import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import type { RoleModdedViewSource } from '@src/domain.objects/RoleModdedViewRecord';
import { getAllRoleModEntries } from '@src/domain.operations/mods/getAllRoleModEntries';
import { asRepoSlugKind } from '@src/domain.operations/role/asRepoSlugKind';
import { asRoleDir } from '@src/domain.operations/role/asRoleDir';
import { getAllLinkedRoleRefs } from '@src/domain.operations/role/getAllLinkedRoleRefs';
import { withRoleViewLock } from '@src/domain.operations/role/withRoleViewLock';

import { asRoleModFaultOrNull } from './asRoleModFaultOrNull';
import { assertRoleModAppliable } from './assertRoleModAppliable';
import { delRoleKindDirSwapLeftovers } from './delRoleKindDirSwapLeftovers';
import { getAllRoleModFaultsOfModsDir } from './getAllRoleModFaultsOfModsDir';
import { getAllRoleViewSources } from './getAllRoleViewSources';
import { getOneRoleModdedViewRecord } from './getOneRoleModdedViewRecord';
import { getOneRoleModHookBasis } from './getOneRoleModHookBasis';
import { getOneRoleModStateOrRefusal } from './getOneRoleModStateOrRefusal';
import { isRoleModdedViewFresh } from './isRoleModdedViewFresh';
import { isRoleModdedViewPlanSame } from './isRoleModdedViewPlanSame';
import { isRoleModdedViewRecordPresent } from './isRoleModdedViewRecordPresent';
import { isRoleModPinnedToRef } from './isRoleModPinnedToRef';
import { isRoleRefSame } from './isRoleRefSame';
import { setRoleModdedView } from './setRoleModdedView';
import { setRoleModdedViewRefusal } from './setRoleModdedViewRefusal';
import { setRoleUnmoddedView } from './setRoleUnmoddedView';

/**
 * .what = return a refused role to its published form, where its dir allows the swap
 * .why = a refused mod must not leave a half-applied view; a dir the swap itself refuses (a
 *        stray file) stays as it is, and its refusal joins the list
 */
const setRoleUnmoddedViewOrRefusal = (
  input: {
    role: string;
    roleDir: string;
    sources: { briefs: RoleModdedViewSource[]; skills: RoleModdedViewSource[] };
  },
  context: ContextCli,
): Array<{ role: string; error: HelpfulError }> => {
  try {
    setRoleUnmoddedView(
      { roleDir: input.roleDir, sources: input.sources },
      context,
    );
    return [];
  } catch (error: unknown) {
    const fault = asRoleModFaultOrNull({ error });
    if (!fault) throw error;
    return [{ role: input.role, error: fault }];
  }
};

/**
 * .what = whether the repo holds a mod dir, or a modded view a mod left behind
 * .why = an unmodded repo, with no view left to revert, takes no lock and writes naught
 */
const isRepoModded = (
  input: { roleMods: string[] },
  context: ContextCli,
): boolean =>
  input.roleMods.length > 0 ||
  getAllLinkedRoleRefs({}, context).some((ref) =>
    isRoleModdedViewRecordPresent({ cwd: context.cwd, ref }),
  );

/**
 * .what = the linked roles a package supplies
 * .why = only a package role has a modded view; a native role is never modded (F18)
 */
const getAllRefsOfPackages = (input: { refs: RoleLinkRef[] }): RoleLinkRef[] =>
  input.refs.filter((ref) => asRepoSlugKind({ slug: ref.repo }) === 'package');

/**
 * .what = whether a linked role of the mod's slug will raise its refusal at boot
 * .why = a package role raises it from its view record; a native role only where the mod names
 *        it (F18). a refusal no role raises must be named by the render instead
 */
const isRoleModRefusalCarried = (input: {
  cwd: string;
  role: string;
  refsLinked: RoleLinkRef[];
}): boolean =>
  input.refsLinked.some(
    (ref) =>
      ref.role === input.role &&
      (asRepoSlugKind({ slug: ref.repo }) === 'package' ||
        isRoleModPinnedToRef({ cwd: input.cwd, ref })),
  );

/**
 * .what = put every modded view on disk in step with `.agent/repo=.mods/`
 * .why = a mod changes the role dir itself (F8 b), so a render must materialize the view
 *        first; every render path calls this one sync (F13)
 *
 * .note = no mod dir and no view record → no write; an unmodded repo's layout is untouched
 * .note = a fresh view is left as it is; a render that changes naught rewrites no link
 * .note = each refusal is caught per role, so it never stops the walk: the role is returned to
 *   its published form where it can be, the refusal is kept in the role's view record, and the
 *   boot of each actor that carries the role skips the mod and names the fault
 * .note = an entry of the mods dir that names no role holds no mod, so it blocks no render:
 *   it is returned as unplaced, with its fix, and the walk goes on. so is a mods path that
 *   cannot be read. the stop sweep still holds the stop on each, so it is never forgotten
 */
export const syncRoleModdedViews = async (
  _input: Record<string, never>,
  context: ContextCli,
): Promise<{
  refusals: Array<{ role: string; error: Error }>;
  skipped: Array<{ role: string; error: Error }>;
  unplaced: Array<{ role: string; error: Error }>;
  changed: string[];
  reverted: string[];
}> => {
  // each mod dir, each stray entry no render can apply, and a mods path that cannot be read,
  //   each named with its fix
  const cwd = context.cwd;
  const {
    modsDir,
    slugs: roleMods,
    strays,
    fault,
  } = getAllRoleModEntries({ cwd });
  const unplacedOfRepo = getAllRoleModFaultsOfModsDir({
    modsDir,
    fault,
    strays,
  });

  // an unmodded repo, with no view left to revert, takes no lock and writes naught
  if (!isRepoModded({ roleMods }, context))
    return {
      refusals: [],
      skipped: [],
      unplaced: unplacedOfRepo,
      changed: [],
      reverted: [],
    };

  // every writer of a role's kind dirs takes turns, so no swap ever sees another's half
  const synced = await withRoleViewLock({ cwd }, () =>
    syncRoleModdedViewsWithinLock({ roleMods }, context),
  );

  // a refusal a role carries is a skip: that role boots as published until the mod is cured
  return { ...synced, unplaced: [...unplacedOfRepo, ...synced.unplaced] };
};

/**
 * .what = the sync itself, run while the repo's mods lock is held
 * .why = the view swap removes and rebuilds kind dirs; under the lock, two renders never
 *        interleave their removals and links
 */
const syncRoleModdedViewsWithinLock = async (
  input: { roleMods: string[] },
  context: ContextCli,
): Promise<{
  refusals: Array<{ role: string; error: Error }>;
  skipped: Array<{ role: string; error: Error }>;
  unplaced: Array<{ role: string; error: Error }>;
  changed: string[];
  reverted: string[];
}> => {
  const cwd = context.cwd;
  const roleMods = input.roleMods;
  const refsLinked = getAllLinkedRoleRefs({}, context);
  const refsPackage = getAllRefsOfPackages({ refs: refsLinked });

  // 🟡 .note = DELIBERATE MUTATION — refusals, targets and changed grow across the per-mod walk; each
  //   mod yields a target or a refusal, and the walk then unmods every other modded view
  // .note = each refusal is placed where it is minted: a role carries it (a skip), or none does
  //   (unplaced). a package role's view carries every refusal of its own arms
  const refusals: Array<{ role: string; error: Error }> = [];
  const skipped: Array<{ role: string; error: Error }> = [];
  const unplaced: Array<{ role: string; error: Error }> = [];
  const targets: RoleLinkRef[] = [];
  const changed: string[] = [];
  const reverted: string[] = [];
  const pushCarried = (ones: Array<{ role: string; error: Error }>): void => {
    refusals.push(...ones);
    skipped.push(...ones);
  };

  // a swap cut short left its build or prior dir behind; under the lock, each is an orphan
  for (const ref of refsPackage)
    pushCarried(delRoleKindDirSwapLeftoversOrRefusal({ cwd, ref }));

  for (const role of roleMods) {
    // the mod as it stands; a refusal before a target is known marks no role dir
    const { state, refusal } = getOneRoleModStateOrRefusal({
      cwd,
      role,
      refsLinked,
    });

    // a refusal a role carries is a skip; one no boot raises is named by the render
    const isRoleCarried = isRoleModRefusalCarried({ cwd, role, refsLinked });
    if (refusal && isRoleCarried) pushCarried([{ role, error: refusal }]);
    if (refusal && !isRoleCarried) {
      refusals.push({ role, error: refusal });
      unplaced.push({ role, error: refusal });
    }
    if (!state) continue;
    targets.push(state.target);

    // the mod applies to its view, or its refusal is kept in the view's record
    const applied = await setRoleModAppliedOrRefusal({ role, state }, context);
    pushCarried(applied.refusals);
    if (applied.isChanged) changed.push(role);
  }

  // a modded view whose mod is gone, or no longer names it, returns to its published form
  for (const ref of refsPackage) {
    const orphan = setRoleOrphanViewRevertedUnlessTarget(
      { ref, targets, refusalsPrior: refusals },
      context,
    );
    pushCarried(orphan.refusals);
    if (orphan.isReportedAsReverted) reverted.push(ref.role);
  }

  return { refusals, skipped, unplaced, changed, reverted };
};

/**
 * .what = sweep one linked role's swap leftovers, or return the refusal that stops the sweep
 * .why = a stray file where a leftover would sit fails that role alone (usecase 12); the walk
 *        over every other role goes on
 */
const delRoleKindDirSwapLeftoversOrRefusal = (input: {
  cwd: string;
  ref: RoleLinkRef;
}): Array<{ role: string; error: Error }> => {
  try {
    delRoleKindDirSwapLeftovers({
      roleDir: asRoleDir({ cwd: input.cwd, ref: input.ref }),
    });
    return [];
  } catch (error: unknown) {
    const fault = asRoleModFaultOrNull({ error });
    if (!fault) throw error;
    return [{ role: input.ref.role, error: fault }];
  }
};

/**
 * .what = return one linked role's view to its published form, unless a mod targets it
 * .why = a view whose mod is gone, or no longer names it, must not outlive the mod; the step
 *        also decides whether the render reports the role as reverted
 *
 * .note = a view of a refused mod returns to published too, but its mod is not gone: its
 *   refusal already names it, so it is not reported as reverted
 */
const setRoleOrphanViewRevertedUnlessTarget = (
  input: {
    ref: RoleLinkRef;
    targets: RoleLinkRef[];
    refusalsPrior: Array<{ role: string; error: Error }>;
  },
  context: ContextCli,
): {
  refusals: Array<{ role: string; error: Error }>;
  isReportedAsReverted: boolean;
} => {
  const isTarget = input.targets.some((target) =>
    isRoleRefSame({ a: target, b: input.ref }),
  );
  if (isTarget) return { refusals: [], isReportedAsReverted: false };
  const orphan = setRoleOrphanViewReverted({ ref: input.ref }, context);
  const isModRefused = [...input.refusalsPrior, ...orphan.refusals].some(
    (one) => one.role === input.ref.role,
  );

  // a fault the mod walk already named (a corrupt record reads the same in both arms) is
  //   named once
  const refusalsNew = orphan.refusals.filter(
    (one) =>
      !input.refusalsPrior.some(
        (prior) =>
          prior.role === one.role && prior.error.message === one.error.message,
      ),
  );
  return {
    refusals: refusalsNew,
    isReportedAsReverted: orphan.isReverted && !isModRefused,
  };
};

/**
 * .what = put one mod's view in step with its mod, or keep its refusal in the view's record
 * .why = a refused mod must not leave a half-applied view; the role returns to its published
 *        form, and the boot of each actor that carries it raises the refusal again
 *
 * .note = isChanged is false for a fresh view and for a rebuild of the same plan (a relink
 *   cleared the disk): neither is a mod change a live clone must hear of
 */
const setRoleModAppliedOrRefusal = async (
  input: {
    role: string;
    state: NonNullable<ReturnType<typeof getOneRoleModStateOrRefusal>['state']>;
  },
  context: ContextCli,
): Promise<{
  refusals: Array<{ role: string; error: Error }>;
  isChanged: boolean;
}> => {
  const { role, state } = input;
  try {
    // a fresh view is left as it is; it passed the hook check against the package installed now
    const record = getOneRoleModdedViewRecord({ roleDir: state.roleDir });
    const { roleDir, links } = state;
    const hookBasis = getOneRoleModHookBasis({
      cwd: context.cwd,
      ref: state.target,
      plan: state.plan,
    });
    if (isRoleModdedViewFresh({ record, roleDir, links, hookBasis }))
      return { refusals: [], isChanged: false };

    // a plan that cannot apply is refused, by the one check the stop sweep also reads
    await assertRoleModAppliable({ state, hookBasis }, context);

    // the mod applies: the view becomes its links
    setRoleModdedView({ roleDir, sources: state.sources, links, hookBasis });
    return {
      refusals: [],
      isChanged: !isRoleModdedViewPlanSame({ record, links }),
    };
  } catch (error: unknown) {
    // a fault the mod gate admits (a refusal, a corrupt record, an errno on a mod path) is this
    //   role's alone; a code defect or an unclassed throw escapes loud
    const fault = asRoleModFaultOrNull({ error });
    if (!fault) throw error;
    const refusalsOfRevert = setRoleUnmoddedViewOrRefusal(
      { role, roleDir: state.roleDir, sources: state.sources },
      context,
    );
    setRoleModdedViewRefusal({
      roleDir: state.roleDir,
      sources: state.sources,
      error: fault,
      paths: [...state.links.keys()],
    });
    return {
      refusals: [{ role, error: fault }, ...refusalsOfRevert],
      isChanged: false,
    };
  }
};

/**
 * .what = return a modded view whose mod is gone to its published form
 * .why = a view that no mod names would boot a mod no author keeps
 *
 * .note = a fault in one view (an unreadable record, a stray file) is that role's refusal
 *   alone, so the walk goes on and only the actors that carry the role fail (usecase 12)
 */
const setRoleOrphanViewReverted = (
  input: { ref: RoleLinkRef },
  context: ContextCli,
): { refusals: Array<{ role: string; error: Error }>; isReverted: boolean } => {
  const roleDir = asRoleDir({ cwd: context.cwd, ref: input.ref });
  try {
    const record = getOneRoleModdedViewRecord({ roleDir });
    if (!record) return { refusals: [], isReverted: false };
    const sources = {
      briefs: getAllRoleViewSources({ roleDir, kind: 'briefs', record }),
      skills: getAllRoleViewSources({ roleDir, kind: 'skills', record }),
    };
    const refusals = setRoleUnmoddedViewOrRefusal(
      { role: input.ref.role, roleDir, sources },
      context,
    );
    for (const { error } of refusals)
      setRoleModdedViewRefusal({ roleDir, sources, error, paths: [] });
    return { refusals, isReverted: refusals.length === 0 };
  } catch (error: unknown) {
    const fault = asRoleModFaultOrNull({ error });
    if (!fault) throw error;
    return {
      refusals: [{ role: input.ref.role, error: fault }],
      isReverted: false,
    };
  }
};
