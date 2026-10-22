import { ROLE_FOCUS_SEPARATOR } from '@src/domain.operations/roles/focus/asRoleFocusParts';

/**
 * .what = the ambient roleset as tokens: each linked role, at its recorded focus
 * .why = a bare enroll inherits the ambient set, and an incremental enroll patches it; both
 *        must see `mechanic::flow` where the ambient record focuses mechanic on flow
 *
 * .note = a role focused on two subjects yields two tokens, which union at the render (S2)
 * .note = a recorded focus of a role no longer linked is dropped — the link is what the
 *         ambient set is made of
 * .note = pure transformer — no i/o, deterministic
 */
export const asRoleSlugsAmbientAtFocus = (input: {
  rolesLinked: string[];
  foci: Record<string, string[]>;
}): string[] =>
  input.rolesLinked.flatMap((role) => {
    const subjects = input.foci[role];

    // a role absent from the record is the whole role
    if (!subjects || subjects.length === 0) return [role];

    // a focused role yields one token per subject
    return subjects.map(
      (subject) => `${role}${ROLE_FOCUS_SEPARATOR}${subject}`,
    );
  });
