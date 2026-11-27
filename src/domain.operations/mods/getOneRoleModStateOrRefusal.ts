import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { asRoleModFaultOrNull } from './asRoleModFaultOrNull';
import { getOneRoleModState } from './getOneRoleModState';

/**
 * .what = one mod's state, or the refusal that stops it, as a value
 * .why = each sweep over the mods must go on past a bad mod (usecase 12), so the refusal is
 *        returned for the caller to place, never thrown past the walk
 *
 * .note = a refusal is a fault the mod gate admits (`asRoleModFaultOrNull`): a ConstraintError,
 *   a MalfunctionError (a corrupt view record), or an fs errno on a path the mod holds. the gate,
 *   the render, and the stop sweep read that one allowlist, so a fault one skips is a fault each
 *   skips. any other throw escapes loud
 */
export const getOneRoleModStateOrRefusal = (input: {
  cwd: string;
  role: string;
  refsLinked: RoleLinkRef[];
}):
  | { state: ReturnType<typeof getOneRoleModState>; refusal: null }
  | { state: null; refusal: Error } => {
  try {
    return { state: getOneRoleModState(input), refusal: null };
  } catch (error: unknown) {
    const refusal = asRoleModFaultOrNull({ error });
    if (!refusal) throw error;
    return { state: null, refusal };
  }
};
