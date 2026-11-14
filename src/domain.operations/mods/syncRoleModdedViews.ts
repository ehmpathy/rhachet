import { ConstraintError, MalfunctionError } from 'helpful-errors';

import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import type { RoleModdedViewSource } from '@src/domain.objects/RoleModdedViewRecord';
import { asRepoSlugKind } from '@src/domain.operations/role/asRepoSlugKind';
import { asRoleDir } from '@src/domain.operations/role/asRoleDir';
import { getAllLinkedRoleRefs } from '@src/domain.operations/role/getAllLinkedRoleRefs';
import { getAllRoleModEntries } from '@src/domain.operations/role/getAllRoleModEntries';
import { withRoleViewLock } from '@src/domain.operations/role/withRoleViewLock';

import { asRoleModRefusalError } from './asRoleModRefusalError';
import { asRoleModStrayEntryError } from './asRoleModStrayEntryError';
import { assertRoleModNotsSpareHookSkills } from './assertRoleModNotsSpareHookSkills';
import { delRoleKindDirSwapLeftovers } from './delRoleKindDirSwapLeftovers';
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
 * .what = every hook command a linked role declares, on each brain event
 * .why = a `not` of a skill one of these invokes is refused (usecase 9)
 *
 * .note = only this role's package loads, and only once a stale view's mod nots a skill, so
 *   most renders pay naught; the narrow brains reader is a lazy import for the same reason
 *   (`rule.require.thinnest-import-path`)
 * .note = a package that fails to load is a refusal, never an empty list: with no hooks to
 *   read, a `not` of a hooked skill would pass and the hook would fail at its next event
 */
const getAllRoleHookCommands = async (
  input: { ref: RoleLinkRef },
  context: ContextCli,
): Promise<string[]> => {
  const { getAllHookCommandsForRole } = await import(
    '@src/domain.operations/brains/getAllHookCommandsForRole'
  );
  const { commands, error } = await getAllHookCommandsForRole({
    ref: input.ref,
    gitroot: context.gitroot,
  });

  // the hooks of a role whose package did not load cannot be read
  if (error)
    throw asRoleModRefusalError({
      role: input.ref.role,
      problem:
        'its package did not load, so no hook can be checked against a not of a skill',
      subject: error.message,
      nearest: null,
      fix: 'repair the install (pnpm install), or drop each not of a skills/ path',
    });
  return commands;
};

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
): Array<{ role: string; error: ConstraintError }> => {
  try {
    setRoleUnmoddedView(
      { roleDir: input.roleDir, sources: input.sources },
      context,
    );
    return [];
  } catch (error: unknown) {
    if (!(error instanceof ConstraintError)) throw error;
    return [{ role: input.role, error }];
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
 * .what = put every modded view on disk in step with `.agent/repo=.mods/`
 * .why = a mod changes the role dir itself (F8 b), so a render must materialize the view
 *        first; every render path calls this one sync (F13)
 *
 * .note = no mod dir and no view record → no write; an unmodded repo's layout is untouched
 * .note = a fresh view is left as it is; a render that changes naught rewrites no link
 * .note = each refusal is caught per role, so it fails only the actors that carry the role
 *   (usecase 12): the role is returned to its published form where it can be, the refusal
 *   is kept in the role's view record, and the boot of each such actor raises it again
 * .note = an entry of the mods dir that names no role holds no mod, so it blocks no render
 *   (usecase 12): it is returned as unplaced, with its fix, and the walk goes on. the stop
 *   sweep still holds the stop on it, so it is never forgotten
 */
export const syncRoleModdedViews = async (
  _input: Record<string, never>,
  context: ContextCli,
): Promise<{
  refusals: Array<{ role: string; error: Error }>;
  unplaced: Array<{ role: string; error: Error }>;
  changed: string[];
  reverted: string[];
}> => {
  // each mod dir, and each stray entry no render can apply, named with its fix
  const cwd = context.cwd;
  const { modsDir, slugs: roleMods, strays } = getAllRoleModEntries({ cwd });
  const unplacedOfStrays = strays.map((entry) => ({
    role: entry,
    error: asRoleModStrayEntryError({ modsDir, entry }),
  }));

  // an unmodded repo, with no view left to revert, takes no lock and writes naught
  if (!isRepoModded({ roleMods }, context))
    return {
      refusals: [],
      unplaced: unplacedOfStrays,
      changed: [],
      reverted: [],
    };

  // every writer of a role's kind dirs takes turns, so no swap ever sees another's half
  const synced = await withRoleViewLock({ cwd }, () =>
    syncRoleModdedViewsWithinLock({ roleMods }, context),
  );
  return { ...synced, unplaced: [...unplacedOfStrays, ...synced.unplaced] };
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
  unplaced: Array<{ role: string; error: Error }>;
  changed: string[];
  reverted: string[];
}> => {
  const cwd = context.cwd;
  const roleMods = input.roleMods;
  const refsLinked = getAllLinkedRoleRefs({}, context);
  const refsPackage = refsLinked.filter(
    (ref) => asRepoSlugKind({ slug: ref.repo }) === 'package',
  );

  // 🟡 .note = DELIBERATE MUTATION — refusals, targets and changed grow across the per-mod walk; each
  //   mod yields a target or a refusal, and the walk then unmods every other modded view
  const refusals: Array<{ role: string; error: Error }> = [];
  const unplaced: Array<{ role: string; error: Error }> = [];
  const targets: RoleLinkRef[] = [];
  const changed: string[] = [];
  const reverted: string[] = [];

  // a swap cut short left its build or prior dir behind; under the lock, each is an orphan
  for (const ref of refsPackage)
    refusals.push(...delRoleKindDirSwapLeftoversOrRefusal({ cwd, ref }));

  for (const role of roleMods) {
    // the mod as it stands; a refusal before a target is known marks no role dir
    const { state, refusal } = getOneRoleModStateOrRefusal({
      cwd,
      role,
      refsLinked,
    });
    if (refusal) refusals.push({ role, error: refusal });

    // a refusal no boot raises is named by the render: a package role of its slug raises it
    //   from its view record, and a native role only where the mod names it (F18)
    const isRoleCarried = refsLinked.some(
      (ref) =>
        ref.role === role &&
        (asRepoSlugKind({ slug: ref.repo }) === 'package' ||
          isRoleModPinnedToRef({ cwd, ref })),
    );
    if (refusal && !isRoleCarried) unplaced.push({ role, error: refusal });
    if (!state) continue;
    targets.push(state.target);

    // the mod applies to its view, or its refusal is kept in the view's record
    const applied = await setRoleModAppliedOrRefusal({ role, state }, context);
    refusals.push(...applied.refusals);
    if (applied.isChanged) changed.push(role);
  }

  // a modded view whose mod is gone, or no longer names it, returns to its published form
  for (const ref of refsPackage) {
    const orphan = setRoleOrphanViewRevertedUnlessTarget(
      { ref, targets, refusalsPrior: refusals },
      context,
    );
    refusals.push(...orphan.refusals);
    if (orphan.isReportedAsReverted) reverted.push(ref.role);
  }

  return { refusals, unplaced, changed, reverted };
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
    if (!(error instanceof ConstraintError)) throw error;
    return [{ role: input.ref.role, error }];
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

    // a not of a skill a hook invokes is refused
    if (hookBasis)
      assertRoleModNotsSpareHookSkills({
        ref: state.target,
        nots: state.plan.nots,
        hookCommands: await getAllRoleHookCommands(
          { ref: state.target },
          context,
        ),
      });

    // the mod applies: the view becomes its links
    setRoleModdedView({ roleDir, sources: state.sources, links, hookBasis });
    return {
      refusals: [],
      isChanged: !isRoleModdedViewPlanSame({ record, links }),
    };
  } catch (error: unknown) {
    if (!(error instanceof ConstraintError)) throw error;
    const refusalsOfRevert = setRoleUnmoddedViewOrRefusal(
      { role, roleDir: state.roleDir, sources: state.sources },
      context,
    );
    setRoleModdedViewRefusal({
      roleDir: state.roleDir,
      sources: state.sources,
      error,
      paths: [...state.links.keys()],
    });
    return {
      refusals: [{ role, error }, ...refusalsOfRevert],
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
    if (
      !(error instanceof ConstraintError) &&
      !(error instanceof MalfunctionError)
    )
      throw error;
    return { refusals: [{ role: input.ref.role, error }], isReverted: false };
  }
};
