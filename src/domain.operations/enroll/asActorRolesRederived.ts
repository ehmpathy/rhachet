import { BrainCliEnrollmentSpec } from '@src/domain.objects/BrainCliEnrollmentSpec';
import type { BrainSlug } from '@src/domain.objects/BrainSlug';
import type { RoleDelta } from '@src/domain.objects/RoleDelta';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';
import { getRoleDeltas } from '@src/domain.operations/roles/deltas/getRoleDeltas';
import { asRoleFocusParts } from '@src/domain.operations/roles/focus/asRoleFocusParts';

import { computeBrainCliEnrollment } from './computeBrainCliEnrollment';

/**
 * .what = whether a delta names a role still linked, matched by its role with the focus stripped
 */
const isDeltaOfLinkedRole = (input: {
  delta: RoleDelta;
  rolesLinked: RoleSlug[];
}): boolean =>
  input.rolesLinked.includes(
    asRoleFocusParts({ token: input.delta.role }).role,
  );

/**
 * .what = a delta actor's roles, re-derived from the CURRENT ambient roles ⊕ its stored delta
 * .why = a delta actor stands for "the repo's roles, plus or minus these". when the repo's
 *   roles move (`rhx init --roles -xyz`), what it stands for moves too
 *   (`inventory.of=requirements.case=2`)
 *
 * .note = the same derivation enroll runs at spawn (`computeBrainCliEnrollment`, incremental)
 * .note = a delta on a role no longer linked is dropped before the derivation: a subtraction
 *   of it is already a no-op, and an addition of it cannot render — the role was removed from
 *   the repo, so it leaves every actor that held it
 */
export const asActorRolesRederived = (input: {
  brain: BrainSlug;
  rolesDelta: string[];
  rolesAmbient: RoleSlug[];
  rolesLinked: RoleSlug[];
}): RoleSlug[] => {
  // 🔴 a focused delta is matched by its role — `mechanic::flow` is no linked slug, so an
  //   unstripped check would drop the seat's mechanic, rails and all, in silence (D1)
  const deltas = getRoleDeltas({ tokens: input.rolesDelta }).filter((delta) =>
    isDeltaOfLinkedRole({ delta, rolesLinked: input.rolesLinked }),
  );
  return computeBrainCliEnrollment({
    brain: input.brain,
    spec: new BrainCliEnrollmentSpec({ mode: 'incremental', deltas }),
    rolesAmbient: input.rolesAmbient,
    rolesLinked: input.rolesLinked,
  }).roles;
};
