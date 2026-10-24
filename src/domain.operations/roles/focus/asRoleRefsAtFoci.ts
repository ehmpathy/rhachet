import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import type { RoleLinkRefAtFocus } from '@src/domain.objects/RoleLinkRefAtFocus';
import { isRoleLinkRefOfRole } from '@src/domain.operations/roles/isRoleLinkRefOfRole';

/**
 * .what = each linked ref a focus names, with the subjects that focus holds
 * .why = an actor's foci name roles; the render needs the linked refs, each with its subjects
 *
 * .note = a focus no ref matches yields naught; the caller refuses an unlinked role first
 * .note = pure transformer — no i/o, deterministic
 */
export const asRoleRefsAtFoci = (input: {
  refs: RoleLinkRef[];
  foci: Array<{ role: string; subjects: string[] | null }>;
}): RoleLinkRefAtFocus[] =>
  input.foci.flatMap((focus) =>
    input.refs
      .filter((ref) => isRoleLinkRefOfRole({ ref, role: focus.role }))
      .map((ref) => ({
        repo: ref.repo,
        role: ref.role,
        subjects: focus.subjects,
      })),
  );
