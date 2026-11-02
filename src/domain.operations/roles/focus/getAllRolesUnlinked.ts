import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { isRoleLinkRefOfRole } from '@src/domain.operations/roles/isRoleLinkRefOfRole';

/**
 * .what = the roles a set of foci names that no linked ref matches
 * .why = a role no longer linked cannot render, so its caller refuses it by name
 *
 * .note = pure transformer — no i/o, deterministic
 */
export const getAllRolesUnlinked = (input: {
  refs: RoleLinkRef[];
  foci: Array<{ role: string }>;
}): string[] =>
  input.foci
    .map((focus) => focus.role)
    .filter(
      (role) => !input.refs.some((ref) => isRoleLinkRefOfRole({ ref, role })),
    );
