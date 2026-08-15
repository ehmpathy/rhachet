import { BadRequestError } from 'helpful-errors';

import type { ActorBrain } from '@src/domain.objects/ActorInmem';
import { ActorInmem } from '@src/domain.objects/ActorInmem';
import type { Role } from '@src/domain.objects/Role';

/**
 * .what = creates an in-mem ACTOR — a recipe: a list of roles plus a brain
 *   allowlist
 * .why =
 *   - an actor is the durable recipe; it is NOT engageable on its own
 *   - bake it into a clone via genClone({ actor }) to get .act()/.run()/.ask()
 *
 * .note =
 *   - an actor composes a LIST of roles (not one); the first brain is the default
 *   - the engage methods live on the clone (CloneInmem), never the actor
 */
export const genActor = <TRoles extends Role[]>(input: {
  roles: TRoles;
  brains: ActorBrain[];
}): ActorInmem<TRoles> => {
  // validate that at least one role is provided
  if (input.roles.length === 0)
    throw new BadRequestError('genActor requires at least one role', {});

  // validate that at least one brain is provided
  if (input.brains.length === 0)
    throw new BadRequestError(
      'genActor requires at least one brain in allowlist',
      { slugsRoles: input.roles.map((role) => role.slug) },
    );

  // return the recipe (no engage methods — those belong to the clone)
  return ActorInmem.typed<TRoles>({
    roles: input.roles,
    brains: input.brains,
  });
};
