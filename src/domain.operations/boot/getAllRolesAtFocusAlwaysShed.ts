import type { RoleLinkRefAtFocus } from '@src/domain.objects/RoleLinkRefAtFocus';

import { getOneRoleBootSpecFromRef } from './getOneRoleBootSpecFromRef';
import { isAlwaysShed } from './isAlwaysShed';

/**
 * .what = the focused roles whose focus sheds the role's `always` block, by slug
 * .why = a subject may opt out of `always`, and the receipt says so, so the shed is never a
 *        surprise to the human who enrolled the focus
 *
 * .note = only a focused ref reads its spec; a whole role never sheds
 */
export const getAllRolesAtFocusAlwaysShed = (input: {
  refs: RoleLinkRefAtFocus[];
  repoPath: string;
}): string[] =>
  input.refs
    .filter((ref) => ref.subjects !== null)
    .filter((ref) => {
      const config = getOneRoleBootSpecFromRef({
        ref,
        repoPath: input.repoPath,
      });
      return (
        config !== null && isAlwaysShed({ config, subjects: ref.subjects })
      );
    })
    .map((ref) => ref.role);
