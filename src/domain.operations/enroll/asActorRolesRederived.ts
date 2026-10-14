import { BrainCliEnrollmentSpec } from '@src/domain.objects/BrainCliEnrollmentSpec';
import type { BrainSlug } from '@src/domain.objects/BrainSlug';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';
import { getRoleDeltas } from '@src/domain.operations/roles/deltas/getRoleDeltas';

import { computeBrainCliEnrollment } from './computeBrainCliEnrollment';

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
  const deltas = getRoleDeltas({ tokens: input.rolesDelta }).filter((delta) =>
    input.rolesLinked.includes(delta.role),
  );
  return computeBrainCliEnrollment({
    brain: input.brain,
    spec: new BrainCliEnrollmentSpec({ mode: 'incremental', deltas }),
    rolesAmbient: input.rolesAmbient,
    rolesLinked: input.rolesLinked,
  }).roles;
};
