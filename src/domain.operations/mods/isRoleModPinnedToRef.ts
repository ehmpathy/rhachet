import { ConstraintError } from 'helpful-errors';

import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { getOneRoleModSpec } from './getOneRoleModSpec';
import { isRoleModDirPresent } from './isRoleModDirPresent';

/**
 * .what = whether the mod of this ref's slug pins this ref's own repo in its `of:`
 * .why = a native role (`.this`) holds no modded view, so its boot is the one place a mod that
 *        names it can be refused (F18); the sync then knows that boot carries the refusal
 *
 * .note = false where no mod dir of the slug exists, or the mod pins no repo or another one
 * .note = false where the spec itself is refused: a spec that does not parse names no repo, so
 *   it cannot be said to pin this one. the refusal is not lost — the sync holds it, and names it
 *   at the render where no role carries it (usecase 6)
 */
export const isRoleModPinnedToRef = (input: {
  cwd: string;
  ref: RoleLinkRef;
}): boolean => {
  if (!isRoleModDirPresent({ cwd: input.cwd, role: input.ref.role }))
    return false;
  try {
    const { spec } = getOneRoleModSpec({
      cwd: input.cwd,
      role: input.ref.role,
    });
    return spec.of.repo === input.ref.repo;
  } catch (error: unknown) {
    if (!(error instanceof ConstraintError)) throw error;
    return false;
  }
};
