import type { RoleLinkRefAtFocus } from '@src/domain.objects/RoleLinkRefAtFocus';
import { getOneRoleBootSpecOrDefectFromRef } from '@src/domain.operations/role/getOneRoleBootSpecOrDefectFromRef';

import { isAlwaysShed } from './isAlwaysShed';

/**
 * .what = the focused roles whose focus sheds the role's `always` block, by slug
 * .why = a subject may opt out of `always`, and the receipt says so, so the shed is never a
 *        surprise to the human who enrolled the focus
 *
 * .note = only a focused ref reads its spec; a whole role never sheds
 * .note = a spec that will not parse renders whole, refs-only, so it sheds naught
 */
export const getAllRolesAtFocusAlwaysShed = (input: {
  refs: RoleLinkRefAtFocus[];
  repoPath: string;
}): string[] =>
  input.refs
    .filter((ref) => ref.subjects !== null)
    .filter((ref) => {
      const { spec, defect } = getOneRoleBootSpecOrDefectFromRef({
        ref,
        repoPath: input.repoPath,
      });
      return (
        !defect &&
        spec !== null &&
        isAlwaysShed({ config: spec, subjects: ref.subjects })
      );
    })
    .map((ref) => ref.role);
