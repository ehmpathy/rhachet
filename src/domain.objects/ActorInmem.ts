import { DomainEntity } from 'domain-objects';
import type { z } from 'zod';

import type { BrainAtom } from './BrainAtom';
import type { BrainRepl } from './BrainRepl';
import type { Role, RoleSkillSchema } from './Role';

/**
 * .what = a brain an in-mem actor/clone can use
 * .why = enables both BrainRepl (.ask + .act) and BrainAtom (.ask only)
 */
export type ActorBrain = BrainRepl | BrainAtom;

/**
 * .what = extracts a skill's input type from a RoleSkillSchema
 * .why = enables type inference for skill arguments
 */
export type SkillInput<TSchema extends RoleSkillSchema> = z.infer<
  TSchema['input']
>;

/**
 * .what = extracts a skill's output type from a RoleSkillSchema
 * .why = enables type inference for skill return values
 */
export type SkillOutput<TSchema extends RoleSkillSchema> = z.infer<
  TSchema['output']
>;

/**
 * .what = the in-mem ACTOR — a recipe: a list of roles composed with a brain
 *   allowlist, ready to be baked into a clone
 * .why =
 *   - an actor is the durable recipe (roles + brains); it is NOT engageable
 *   - a clone is baked from it via genClone({ actor }) and carries the
 *     .act()/.run()/.ask() engage methods (see CloneInmem)
 *
 * .note = partition = in-mem (the SDK grain). the on-disk actor record is
 *   ActorOndisk. see define.actor-clone-partitions.md — contracts speak the
 *   bare `Actor`; the `Inmem` suffix is the internal partition marker.
 * .note = an actor composes a LIST of roles; the first brain is the default
 */
export interface ActorInmem<TRoles extends Role[] = Role[]> {
  /**
   * .what = the roles this actor composes
   */
  roles: TRoles;

  /**
   * .what = the brains this actor is allowed to use
   * .note = first brain is the default
   */
  brains: ActorBrain[];
}

export class ActorInmem<TRoles extends Role[] = Role[]>
  extends DomainEntity<ActorInmem<TRoles>>
  implements ActorInmem<TRoles>
{
  /**
   * .what = creates an ActorInmem with preserved literal role types from TRoles
   * .why = enables the baked clone's type-safe .act()/.run()/.ask() inference
   */
  public static typed<TRoles extends Role[]>(
    input: ActorInmem<TRoles>,
  ): ActorInmem<TRoles> {
    return new ActorInmem<TRoles>(input);
  }
}
