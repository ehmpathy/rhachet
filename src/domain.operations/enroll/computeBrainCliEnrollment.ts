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
 * .note = replace mode: ops become final roles (defaults ignored)
 * .note = delta mode: ops modify defaults (+append, -subtract)
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
    input.spec.mode === 'replace'
      ? computeRolesForReplaceMode({
          ops: input.spec.ops,
          rolesLinked: input.rolesLinked,
        })
      : computeRolesForDeltaMode({
          ops: input.spec.ops,
          rolesDefault: input.rolesDefault,
          rolesLinked: input.rolesLinked,
        });

  return new BrainCliEnrollmentManifest({
    brain: input.brain,
    roles: rolesComputed,
  });
};

/**
 * .what = computes roles for replace mode
 * .why = ops become final roles, defaults ignored
 */
const computeRolesForReplaceMode = (input: {
  ops: BrainCliEnrollmentSpec['ops'];
  rolesLinked: RoleSlug[];
}): RoleSlug[] => {
  const roles: RoleSlug[] = [];

  for (const op of input.ops) {
    // validate role exists
    validateRoleExists({ role: op.role, rolesLinked: input.rolesLinked });

    // in replace mode, all ops are 'add' (parser ensures this)
    if (op.action === 'add' && !roles.includes(op.role)) {
      roles.push(op.role);
    }
  }

  return roles;
};

/**
 * .what = computes roles for delta mode
 * .why = ops modify defaults (+append, -subtract)
 */
const computeRolesForDeltaMode = (input: {
  ops: BrainCliEnrollmentSpec['ops'];
  rolesDefault: RoleSlug[];
  rolesLinked: RoleSlug[];
}): RoleSlug[] => {
  // start with defaults
  const roles = new Set(input.rolesDefault);

  for (const op of input.ops) {
    // validate role exists
    validateRoleExists({ role: op.role, rolesLinked: input.rolesLinked });

    if (op.action === 'add') {
      // +present role → no-op (idempotent)
      roles.add(op.role);
    } else {
      // -absent role → no-op (idempotent)
      roles.delete(op.role);
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

  throw new BadRequestError(`role '${input.role}' not found${suggestionText}`, {
    role: input.role,
    rolesLinked: input.rolesLinked,
    suggestion,
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
