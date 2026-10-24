import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import type { RoleLinkRefAtFocus } from '@src/domain.objects/RoleLinkRefAtFocus';

/**
 * .what = each linked ref, with the subjects a foci record holds for its role
 * .why = the repo actor's render and init's receipt both pair a linked role with its recorded
 *        focus; one transformer means both read an absent entry the same way
 *
 * .note = a role absent from the record is the whole role (`subjects: null`)
 * .note = pure transformer — no i/o, deterministic
 */
export const asRoleRefsAtFocus = (input: {
  refs: RoleLinkRef[];
  foci: Record<string, string[]>;
}): RoleLinkRefAtFocus[] =>
  input.refs.map((ref) => ({ ...ref, subjects: input.foci[ref.role] ?? null }));
