import { ConstraintError } from 'helpful-errors';

import { lstatSync } from 'node:fs';
import { asBootRoleCoordinates } from './asBootRoleCoordinates';

/**
 * .what = whether a boot spec is owned by ANOTHER repo
 * .why = a budget must refuse at a file the caller can WRITE. a linked role spec is a
 *        symlink into a version-pinned pnpm store, so every remedy a halt could name
 *        (catalogize, condense, reference, eliminate, raise) is a write the caller cannot
 *        make. so the refusal rung is computed from ownership, never fixed as a constant
 *        (`0.wish.md` requirement 8).
 *
 * .note = the test is ONE syscall, and it is exact rather than a proxy: `rhachet roles link`
 *   is the only writer under `.agent/repo=$slug/role=$name/`, and what it writes is a
 *   symlink. so the symlink is not a SIGNAL of foreign ownership — it is the MECHANISM by
 *   which a foreign role enters a repo.
 *   see `define.invariant.a-symlink-under-agent-is-foreign`.
 *
 * .note = the invariant is bounded to `.agent/repo=$slug/role=$name/`, and this respects
 *   that bound. outside it a bare symlink test is wrong — this repo links within itself (a
 *   route dreams/ into .dream/), so a symlink there is ours. a `--what` spec is
 *   ours by construction: `getOneBootSource` already refuses any path outside the repo.
 *
 * 🔴 .note = the lstat fault is narrowed to a CLOSED, caller-fixable set — EACCES/EPERM/
 *   ELOOP/ENAMETOOLONG, the same set `getOneManifestPathStat` lifts to a ConstraintError.
 *   any other fault (an EIO, a code defect) rethrows unclassified, so it keeps its
 *   default exit 1 rather than read as a path the caller typed wrong
 *   (`rule.require.exit-code-semantics`, `rule.forbid.failhide`).
 */
export const isBootSpecForeign = (input: {
  pathToSpec: string;
  cwd: string;
}): boolean => {
  // outside `.agent/repo=$slug/role=$name/` the biconditional does not hold — say "ours"
  //
  // .note = `strict: false`, because this arm asks whether the path sits UNDER a linked
  //   role, never whether it IS the spec. the bound covers every resource beneath the
  //   coordinate, so a depth check here would let a linked brief read as ours
  const isUnderLinkedRole =
    asBootRoleCoordinates({
      path: input.pathToSpec,
      cwd: input.cwd,
      strict: false,
    }) !== null;
  if (!isUnderLinkedRole) return false;

  // an absent spec is not foreign — a role with no boot.yml says all, and says it as ours
  //
  // .note = `throwIfNoEntry: false` rather than a SEPARATE existence probe, which would be
  //   a second syscall AND a race. the extant say-all fallback makes absence routine here.
  const stat = ((): ReturnType<typeof lstatSync> | undefined => {
    try {
      return lstatSync(input.pathToSpec, { throwIfNoEntry: false });
    } catch (error: unknown) {
      const code = (error as NodeJS.ErrnoException).code;
      const isCallerFixable =
        code === 'EACCES' ||
        code === 'EPERM' ||
        code === 'ELOOP' ||
        code === 'ENAMETOOLONG';
      if (!isCallerFixable) throw error;

      throw new ConstraintError('a linked role spec could not be read', {
        path: input.pathToSpec,
        why: `the filesystem refused the read (${code})`,
        hint: 'grant read access to the path and every dir above it, or fix the symlink cycle',
      });
    }
  })();
  if (!stat) return false;

  return stat.isSymbolicLink();
};
