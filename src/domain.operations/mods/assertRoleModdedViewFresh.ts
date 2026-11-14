import { ConstraintError } from 'helpful-errors';

import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import type { RoleModPlan } from '@src/domain.objects/RoleModPlan';
import type { RoleModSpec } from '@src/domain.objects/RoleModSpec';
import { RoleModViewStaleError } from '@src/domain.objects/RoleModViewStaleError';
import { asRoleDir } from '@src/domain.operations/role/asRoleDir';

import { getAllRoleModdedViewDriftPaths } from './getAllRoleModdedViewDriftPaths';
import { getOneRoleModdedViewRecord } from './getOneRoleModdedViewRecord';
import { getOneRoleModHookBasis } from './getOneRoleModHookBasis';
import { getOneRoleModSpec } from './getOneRoleModSpec';
import { getOneRoleModState } from './getOneRoleModState';
import { getOneRoleModTargetLinked } from './getOneRoleModTargetLinked';
import { getOneRolePackageVersion } from './getOneRolePackageVersion';
import { isRoleModDirPresent } from './isRoleModDirPresent';
import { isRoleModHookBasisSame } from './isRoleModHookBasisSame';
import { isRoleModOfAnotherLinkedRole } from './isRoleModOfAnotherLinkedRole';
import { isRoleRefSame } from './isRoleRefSame';

/**
 * .what = the refusal of a view that lags its mod
 * .why = a boot never heals the view (F14); it names the render that does
 */
const asStaleViewError = (input: {
  ref: RoleLinkRef;
  why: string;
  paths: string[];
}): RoleModViewStaleError =>
  new RoleModViewStaleError(
    `the modded view of role=${input.ref.role} is stale: ${input.why}`,
    {
      role: `${input.ref.repo}/${input.ref.role}`,
      ...(input.paths.length > 0
        ? { paths: input.paths.slice(0, 7).join(', ') }
        : {}),
      fix: 'run rhx init --hooks, which re-renders every boot and the view from the mod',
    },
  );

/**
 * .what = whether two lists hold the same paths, in any order
 */
const isPathSetSame = (input: { a: string[]; b: string[] }): boolean => {
  const a = [...input.a].sort();
  const b = [...input.b].sort();
  return a.length === b.length && a.every((path, index) => path === b[index]);
};

/**
 * .what = the mod a role boots under, after a check that its view on disk is fresh
 * .why = a boot reads the role dir as the view left it, so a view that lags its mod would boot
 *        a role the mod no longer describes; that fails loud, and no file is written (F8, F14)
 *
 * .note = null where the role is unmodded — no mod dir names it, and no view record remains
 * .note = a refusal the last render recorded (a hook conflict, a stray file) is raised again
 *   here, so the actor that carries the role fails, and only it (usecase 12) — but only while
 *   the mod plans what it did then; a mod changed since names the render, never the old cause
 * .note = `getRefsLinked` is called only where a mod dir of the slug exists, so an unmodded
 *   repo pays no scan
 */
export const assertRoleModdedViewFresh = (input: {
  cwd: string;
  ref: RoleLinkRef;
  getRefsLinked: () => RoleLinkRef[];
}): { spec: RoleModSpec; plan: RoleModPlan; ofLabel: string } | null => {
  const roleDir = asRoleDir({ cwd: input.cwd, ref: input.ref });
  const record = getOneRoleModdedViewRecord({ roleDir });
  const hasModDir = isRoleModDirPresent({
    cwd: input.cwd,
    role: input.ref.role,
  });
  if (!record && !hasModDir) return null;

  // a mod pinned to another linked repo is over another role of this slug; this one boots as
  //   published. a pin to a repo no link holds is a typo, and falls through to its refusal
  const modSpec = hasModDir
    ? getOneRoleModSpec({ cwd: input.cwd, role: input.ref.role })
    : null;
  const refsLinked = modSpec ? input.getRefsLinked() : [];
  const isOfAnotherLinkedRole = isRoleModOfAnotherLinkedRole({
    ofRepo: modSpec?.spec.of.repo ?? null,
    ref: input.ref,
    refsLinked,
  });
  if (isOfAnotherLinkedRole && !record) return null;

  // the role the mod is over; only that role's boot derives the plan, so a refusal of the plan
  //   lands on the actor that carries the mod's role, never on a same-slug peer (usecase 12)
  const modTarget = modSpec
    ? {
        target: getOneRoleModTargetLinked({
          of: modSpec.spec.of,
          refsLinked,
        }),
      }
    : null;
  const isTarget =
    !!modTarget && isRoleRefSame({ a: modTarget.target, b: input.ref });
  if (modTarget && !isTarget && !record) return null;
  const state =
    modTarget && isTarget
      ? getOneRoleModState({
          cwd: input.cwd,
          role: input.ref.role,
          refsLinked,
        })
      : null;

  // the last render refused this mod; the refusal stands while the mod plans what it did then
  if (record?.refusal) {
    const pathsNow = state ? [...state.links.keys()] : [];
    if (!isPathSetSame({ a: pathsNow, b: record.refusal.paths }))
      throw asStaleViewError({
        ref: input.ref,
        why: 'the mod changed after the last render refused it',
        paths: [],
      });
    throw new ConstraintError(record.refusal.message, {
      ...record.refusal.metadata,
      then: 'run rhx init --hooks once the cause is fixed; it re-renders the view',
    });
  }

  // a view whose mod is gone
  if (!modTarget)
    throw asStaleViewError({
      ref: input.ref,
      why: 'its mod dir was removed',
      paths: [],
    });
  if (!state)
    throw asStaleViewError({
      ref: input.ref,
      why: `its mod now names ${modTarget.target.repo}/${modTarget.target.role}`,
      paths: [],
    });
  if (!record)
    throw asStaleViewError({
      ref: input.ref,
      why: 'its mod has no rendered view, since the mod was added or was fixed after a refused render',
      paths: [],
    });

  // the view on disk must hold exactly the plan's links
  const paths = getAllRoleModdedViewDriftPaths({ roleDir, links: state.links });
  if (paths.length > 0)
    throw asStaleViewError({
      ref: input.ref,
      why: 'the mod or its published role changed after the last render',
      paths,
    });

  // the hook check must have been made against the package installed now; a bump can add a
  //   hook over a `not`ed skill and leave the file set as it was (usecase 9)
  const hookBasis = getOneRoleModHookBasis({
    cwd: input.cwd,
    ref: state.target,
    plan: state.plan,
  });
  if (
    !isRoleModHookBasisSame({ recorded: record.hookBasis, needed: hookBasis })
  )
    throw asStaleViewError({
      ref: input.ref,
      why: 'its hooks were not checked against the role package installed now',
      paths: [],
    });

  return {
    spec: state.spec,
    plan: state.plan,
    ofLabel: asRoleModOfLabel({
      cwd: input.cwd,
      repo: state.target.repo,
      role: state.target.role,
      versionDeclared: state.spec.of.version,
    }),
  };
};

/**
 * .what = the role a boot notice names: `repo/role`, its pin, and the installed version where
 *         the two differ
 * .why = after a release moved the role, the clone must read which version the mod was written
 *        against and which version it now changes, never the pin alone (usecase 5)
 */
const asRoleModOfLabel = (input: {
  cwd: string;
  repo: string;
  role: string;
  versionDeclared: string | null;
}): string => {
  const label = `${input.repo}/${input.role}`;
  if (!input.versionDeclared) return label;
  const versionInstalled = getOneRolePackageVersion({
    cwd: input.cwd,
    repo: input.repo,
  });
  if (!versionInstalled || versionInstalled === input.versionDeclared)
    return `${label}@${input.versionDeclared}`;
  return `${label}@${input.versionDeclared} (installed ${versionInstalled})`;
};
