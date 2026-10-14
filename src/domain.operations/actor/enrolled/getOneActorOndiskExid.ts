import type { BrainSlug } from '@src/domain.objects/BrainSlug';
import type { ContextOfRepoRoles } from '@src/domain.objects/ContextOfRepoRoles';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';

import { asActorOndiskExidForHash } from './asActorOndiskExidForHash';
import { REPO_ACTOR_EXID } from './constants';
import { isRolesetAmbient } from './isRolesetAmbient';

/**
 * .what = the one derivation: a resolved roleset → the exid of the actor that holds it
 * .why = the actor is never chosen, only derived. the ambient roleset → the repo actor
 *        (`repo=ambient`); any other roleset → its hash actor (`hash=<h>`). a bare enroll
 *        and `--roles <exactly the ambient set>` both collapse into the repo actor
 *
 * .note = every enroll path routes through here; no caller computes an actor dir by hand
 * .note = `rolesDelta` (from `asActorRolesDelta`) keys a delta actor by its delta, so the
 *         ambient set may move under it (`inventory.of=requirements.case=2`)
 */
export const getOneActorOndiskExid = (
  input: {
    brain: BrainSlug;
    roles: RoleSlug[];
    rolesDelta?: string[] | null;
  },
  context: ContextOfRepoRoles,
): string =>
  isRolesetAmbient({
    roles: input.roles,
    rolesAmbient: context.repo.ambient.roles,
  })
    ? REPO_ACTOR_EXID
    : asActorOndiskExidForHash(input, context);
