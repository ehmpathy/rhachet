import type { BrainCliEnrollmentSpec } from '@src/domain.objects/BrainCliEnrollmentSpec';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';
import { getRoleDeltasOfKind } from '@src/domain.operations/roles/deltas/getRoleDeltasOfKind';
import {
  asRoleFocusChanges,
  type RoleFocusChange,
} from '@src/domain.operations/roles/focus/asRoleFocusChanges';
import { asRoleFocusMap } from '@src/domain.operations/roles/focus/asRoleFocusMap';
import { isRoleSpecifierMatch } from '@src/domain.operations/roles/isRoleSpecifierMatch';

/**
 * .what = the focus changes an enroll's roles spec made, and each focus it inherited
 * .why = a delta patches the ambient set, so its foci narrow, move or widen what was held; an
 *        exact set replaces it, so it held naught and each focus it names is given fresh.
 *        a focus a delta enroll inherits from the repo's record, untouched, is named `held`,
 *        so a seat never boots narrowed with no word of why
 *
 * .note = pure transformer — no i/o, deterministic
 */
export const asEnrollRoleFocusChanges = (input: {
  spec: BrainCliEnrollmentSpec;
  rolesAmbient: RoleSlug[];
  rolesAfter: RoleSlug[];
}): RoleFocusChange[] => {
  // an exact set held naught, so each focus it names is given
  if (input.spec.mode !== 'incremental')
    return asRoleFocusChanges({
      rolesBefore: [],
      rolesAfter: input.rolesAfter,
      additions: [],
    });

  // a delta is read against the ambient set it patched
  const changes = asRoleFocusChanges({
    rolesBefore: input.rolesAmbient,
    rolesAfter: input.rolesAfter,
    additions: getRoleDeltasOfKind({
      deltas: input.spec.deltas,
      kind: 'addition',
    }),
  });

  // each focus held after the call that no change names was inherited from the record
  const held = asRoleFocusMap({ tokens: input.rolesAfter }).flatMap(
    (entry): RoleFocusChange[] =>
      entry.subjects === null ||
      changes.some((change) =>
        isRoleSpecifierMatch({ left: change.role, right: entry.role }),
      )
        ? []
        : [
            {
              role: entry.role,
              kind: 'held',
              from: entry.subjects,
              to: entry.subjects,
            },
          ],
  );
  return [...changes, ...held];
};
