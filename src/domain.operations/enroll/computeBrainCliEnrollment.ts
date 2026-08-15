import { distance } from 'fastest-levenshtein';
import { BadRequestError } from 'helpful-errors';

import { BrainCliEnrollmentManifest } from '@src/domain.objects/BrainCliEnrollmentManifest';
import type { BrainCliEnrollmentSpec } from '@src/domain.objects/BrainCliEnrollmentSpec';
import type { BrainSlug } from '@src/domain.objects/BrainSlug';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';

/**
 * .what = computes final enrollment from spec and available roles
 * .why = translates user spec into validated manifest for config generation
 *
 * .note = absolute mode: deltas become final roles (defaults ignored)
 * .note = incremental mode: deltas patch defaults (+addition appends, -subtraction subtracts)
 * .note = validates all roles against rolesLinked, suggests on typo
 */
export const computeBrainCliEnrollment = (input: {
  brain: BrainSlug;
  spec: BrainCliEnrollmentSpec;
  rolesDefault: RoleSlug[];
  rolesLinked: RoleSlug[];
}): BrainCliEnrollmentManifest => {
  // compute roles based on mode
  const rolesComputed =
    input.spec.mode === 'absolute'
      ? computeRolesForAbsoluteMode({
          deltas: input.spec.deltas,
          rolesLinked: input.rolesLinked,
        })
      : computeRolesForIncrementalMode({
          deltas: input.spec.deltas,
          rolesDefault: input.rolesDefault,
          rolesLinked: input.rolesLinked,
        });

  return new BrainCliEnrollmentManifest({
    brain: input.brain,
    roles: rolesComputed,
  });
};

/**
 * .what = computes roles for absolute mode
 * .why = deltas become final roles, defaults ignored
 */
const computeRolesForAbsoluteMode = (input: {
  deltas: BrainCliEnrollmentSpec['deltas'];
  rolesLinked: RoleSlug[];
}): RoleSlug[] => {
  const roles: RoleSlug[] = [];

  for (const delta of input.deltas) {
    // validate role exists
    validateRoleExists({ role: delta.role, rolesLinked: input.rolesLinked });

    // in absolute mode, all deltas are 'absolute' members (parser ensures this)
    if (delta.kind === 'absolute' && !roles.includes(delta.role)) {
      roles.push(delta.role);
    }
  }

  return roles;
};

/**
 * .what = computes roles for incremental mode
 * .why = deltas patch defaults (+addition appends, -subtraction subtracts)
 */
const computeRolesForIncrementalMode = (input: {
  deltas: BrainCliEnrollmentSpec['deltas'];
  rolesDefault: RoleSlug[];
  rolesLinked: RoleSlug[];
}): RoleSlug[] => {
  // start with defaults
  const roles = new Set(input.rolesDefault);

  for (const delta of input.deltas) {
    // validate role exists
    validateRoleExists({ role: delta.role, rolesLinked: input.rolesLinked });

    if (delta.kind === 'addition') {
      // +present role → no-op (idempotent)
      roles.add(delta.role);
    } else {
      // -absent role → no-op (idempotent)
      roles.delete(delta.role);
    }
  }

  return [...roles];
};

/**
 * .what = validates role exists in linked roles
 * .why = catches typos with helpful suggestion
 */
const validateRoleExists = (input: {
  role: RoleSlug;
  rolesLinked: RoleSlug[];
}): void => {
  if (input.rolesLinked.includes(input.role)) return;

  // find closest match for suggestion
  const suggestion = findClosestRole({
    role: input.role,
    rolesLinked: input.rolesLinked,
  });

  const suggestionText = suggestion ? `, did you mean '${suggestion}'?` : '';

  // name the fix in the human error: the caller must pick from the roles actually
  // linked (or link one first when none are). withCliOutputErrors renders this
  // `hint` as the `└─ <fix>` line and asCliErrorJson carries it as a field, so the
  // valid-roles context is preserved in the ergonomic form (not a raw metadata
  // dump) — rule.require.errors-name-the-fix
  const hint =
    input.rolesLinked.length > 0
      ? `linked roles: ${input.rolesLinked.join(', ')}`
      : 'no roles linked yet — run `rhx init --roles <role>` first';

  throw new BadRequestError(`role '${input.role}' not found${suggestionText}`, {
    role: input.role,
    rolesLinked: input.rolesLinked,
    suggestion,
    hint,
  });
};

/**
 * .what = finds closest role match via levenshtein distance
 * .why = provides helpful typo suggestions
 */
const findClosestRole = (input: {
  role: RoleSlug;
  rolesLinked: RoleSlug[];
}): RoleSlug | null => {
  if (input.rolesLinked.length === 0) return null;

  // find role with smallest distance
  let closest: RoleSlug | null = null;
  let closestDistance = Infinity;

  for (const candidate of input.rolesLinked) {
    const dist = distance(input.role, candidate);
    if (dist < closestDistance) {
      closestDistance = dist;
      closest = candidate;
    }
  }

  // only suggest if distance is reasonable (less than half the length)
  if (closest && closestDistance <= Math.ceil(input.role.length / 2)) {
    return closest;
  }

  return null;
};
