import { ConstraintError, MalfunctionError } from 'helpful-errors';

import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { getOneRoleModState } from './getOneRoleModState';

/**
 * .what = one mod's state, or the refusal that stops it, as a value
 * .why = each sweep over the mods must go on past a bad mod (usecase 12), so the refusal is
 *        returned for the caller to place, never thrown past the walk
 *
 * .note = a ConstraintError is a refusal; so is a MalfunctionError, which a corrupt view
 *   record raises: it is a fault of that role's view alone, so it fails only the actors that
 *   carry the role, as the orphan arm of the sync already holds. any other fault throws
 */
export const getOneRoleModStateOrRefusal = (input: {
  cwd: string;
  role: string;
  refsLinked: RoleLinkRef[];
}):
  | { state: ReturnType<typeof getOneRoleModState>; refusal: null }
  | { state: null; refusal: ConstraintError | MalfunctionError } => {
  try {
    return { state: getOneRoleModState(input), refusal: null };
  } catch (error: unknown) {
    const isRefusal =
      error instanceof ConstraintError || error instanceof MalfunctionError;
    if (!isRefusal) throw error;
    return { state: null, refusal: error };
  }
};
