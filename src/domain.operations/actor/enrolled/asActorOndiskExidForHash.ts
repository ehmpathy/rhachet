import { MalfunctionError } from 'helpful-errors';

import type { BrainSlug } from '@src/domain.objects/BrainSlug';
import type { ContextOfRepoRoles } from '@src/domain.objects/ContextOfRepoRoles';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';

import { REPO_ACTOR_EXID } from './constants';
import { genEnrollmentHash } from './genEnrollmentHash';
import { genEnrollmentHashOfDelta } from './genEnrollmentHashOfDelta';
import { isRolesetAmbient } from './isRolesetAmbient';

/**
 * .what = mint the exid of a HASH actor — `hash=<h>`, where `h` digests the actor's delta
 *   over the ambient roles when it has one, else its concrete roles
 * .why =
 *   - a hash actor holds specific roles, never the ambient ones: the ambient roles live in
 *     the repo actor, and only there (`term=ambient`)
 *   - a delta actor (`--roles -driver`) keeps one identity while the ambient set moves, so
 *     `rhx init --roles -xyz` re-derives it rather than orphan it
 *     (`inventory.of=requirements.case=2`)
 *
 * .note = the clamp: it takes the ambient roleset as input and refuses it, loud. no
 *         caller — present or future — can mint a hash twin of the repo actor, because
 *         the only way to mint a hash exid names the ambient roles it must differ from
 */
export const asActorOndiskExidForHash = (
  input: {
    brain: BrainSlug;
    roles: RoleSlug[];
    rolesDelta?: string[] | null;
  },
  context: ContextOfRepoRoles,
): string => {
  const rolesAmbient = context.repo.ambient.roles;
  if (isRolesetAmbient({ roles: input.roles, rolesAmbient }))
    throw new MalfunctionError(
      'a hash actor was minted for the ambient roles — they belong to the repo actor',
      {
        roles: input.roles,
        rolesAmbient,
        hint: `route through getOneActorOndiskExid, which maps the ambient roles to '${REPO_ACTOR_EXID}'`,
      },
    );

  // a delta actor is identified by its delta, so the ambient set may move under it
  if (input.rolesDelta && input.rolesDelta.length > 0)
    return `hash=${genEnrollmentHashOfDelta({ brain: input.brain, rolesDelta: input.rolesDelta })}`;

  // any other actor is identified by its concrete roles
  return `hash=${genEnrollmentHash({ brain: input.brain, roles: input.roles })}`;
};
