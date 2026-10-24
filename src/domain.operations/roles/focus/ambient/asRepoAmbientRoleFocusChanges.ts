import {
  asRoleFocusChanges,
  type RoleFocusChange,
} from '@src/domain.operations/roles/focus/asRoleFocusChanges';

import { asRoleSlugsAmbientAtFocus } from './asRoleSlugsAmbientAtFocus';

/**
 * .what = the focus changes an `rhx init --roles` made to the roles the repo already held
 * .why = init names a focus change the same way enroll does (F6), so a `+mechanic::101` atop a
 *        held mechanic reads as a narrow, never as a silent rewrite of the ambient record
 *
 * .note = before holds only roles still linked after: a role this init removed holds no
 *         focus. after holds every role linked, so a role this init first linked at a focus
 *         reads as given that focus
 * .note = pure transformer — no i/o, deterministic
 */
export const asRepoAmbientRoleFocusChanges = (input: {
  rolesLinkedBefore: string[];
  rolesLinkedAfter: string[];
  fociPrior: Record<string, string[]>;
  foci: Record<string, string[]>;
  additions: string[];
}): RoleFocusChange[] => {
  const rolesHeld = input.rolesLinkedBefore.filter((role) =>
    input.rolesLinkedAfter.includes(role),
  );
  return asRoleFocusChanges({
    rolesBefore: asRoleSlugsAmbientAtFocus({
      rolesLinked: rolesHeld,
      foci: input.fociPrior,
    }),
    rolesAfter: asRoleSlugsAmbientAtFocus({
      rolesLinked: input.rolesLinkedAfter,
      foci: input.foci,
    }),
    additions: input.additions,
  });
};
