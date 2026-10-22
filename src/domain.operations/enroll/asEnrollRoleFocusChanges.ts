import type { BrainCliEnrollmentSpec } from '@src/domain.objects/BrainCliEnrollmentSpec';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';
import { getRoleDeltasOfKind } from '@src/domain.operations/roles/deltas/getRoleDeltasOfKind';
import {
  asRoleFocusChanges,
  type RoleFocusChange,
} from '@src/domain.operations/roles/focus/asRoleFocusChanges';

/**
 * .what = the focus changes an enroll's roles spec made
 * .why = a delta patches the ambient set, so its foci narrow, move or widen what was held; an
 *        exact set replaces it, so it held naught and each focus it names is given fresh
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
  return asRoleFocusChanges({
    rolesBefore: input.rolesAmbient,
    rolesAfter: input.rolesAfter,
    additions: getRoleDeltasOfKind({
      deltas: input.spec.deltas,
      kind: 'addition',
    }),
  });
};
