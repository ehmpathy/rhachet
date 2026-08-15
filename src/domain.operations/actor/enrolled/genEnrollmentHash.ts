import type { BrainSlug } from '@src/domain.objects/BrainSlug';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';

import { createHash } from 'node:crypto';

/**
 * .what = the 8-char content hash that identifies an enrollment { brain, roles }
 * .why =
 *   - `rhx enroll` is identity-by-roleset: the same { brain, roles } always
 *     hashes to the same value, so every clone of that identity shares one
 *     config dir and stays in sync. this hash IS the anonymous actor's id
 *     (`actor.via.hash=<hash>/`) and the enrollment config filename suffix
 *   - roles are sorted before the digest so role ORDER never forks the identity
 *     ([driver, mechanic] and [mechanic, driver] are the one actor)
 *
 * .note = the sort is on a COPY — the caller's roles array is never mutated
 * .note = a change to this hash SHAPE would orphan every extant actor dir; if
 *   ever needed, migrate via a versioned prefix (a standard content-address move)
 */
export const genEnrollmentHash = (input: {
  brain: BrainSlug;
  roles: RoleSlug[];
}): string => {
  const data = JSON.stringify({
    brain: input.brain,
    roles: [...input.roles].sort(),
  });
  return createHash('sha256').update(data).digest('hex').slice(0, 8);
};
