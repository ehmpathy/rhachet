import { DomainEntity } from 'domain-objects';
import type { z } from 'zod';

import type { BrainRepl } from './BrainRepl';
import type { Role, RoleSkillSchema } from './Role';

/**
 * .what = extracts skill input type from a RoleSkillSchema
 * .why = enables type inference for skill arguments
 */
export type SkillInput<TSchema extends RoleSkillSchema> = z.infer<
  TSchema['input']
>;

/**
 * .what = extracts skill output type from a RoleSkillSchema
 * .why = enables type inference for skill return values
 */
export type SkillOutput<TSchema extends RoleSkillSchema> = z.infer<
  TSchema['output']
>;

/**
 * .what = type for actor.act() method
 * .why = enables type-safe rigid skill invocation
 */
export type ActorActOp<TRole extends Role> = <
  TSkillSlug extends keyof NonNullable<TRole['skills']['rigid']>,
>(input: {
  brain?: { repo: string; slug: string } | BrainRepl;
  skill: {
    [K in TSkillSlug]: SkillInput<NonNullable<TRole['skills']['rigid']>[K]>;
  };
}) => Promise<SkillOutput<NonNullable<TRole['skills']['rigid']>[TSkillSlug]>>;

/**
 * .what = type for actor.run() method
 * .why = enables type-safe solid skill invocation
 */
export type ActorRunOp<TRole extends Role> = <
  TSkillSlug extends keyof NonNullable<TRole['skills']['solid']>,
>(input: {
  skill: {
    [K in TSkillSlug]: SkillInput<NonNullable<TRole['skills']['solid']>[K]>;
  };
}) => Promise<SkillOutput<NonNullable<TRole['skills']['solid']>[TSkillSlug]>>;

/**
 * .what = type for actor.ask() method
 * .why = enables fluid conversation with brain
 */
export type ActorAskOp = (input: {
  prompt: string;
}) => Promise<{ response: string }>;

/**
 * .what = a role assumed by a brain, ready for invocation
 * .why =
 *   - enables sdk users to import and invoke actors directly
 *   - composes role (skills + briefs) with brain allowlist
 *   - provides type-safe .act(), .run(), .ask() methods
 *
 * .note = Actor = BrainRepl + Role composition
 *   - first brain in allowlist is the default
 *   - .act() invokes rigid skills (deterministic harness, brain operations)
 *   - .run() invokes solid skills (deterministic, no brain)
 *   - .ask() starts fluid conversation with default brain
 */
export interface Actor<TRole extends Role = Role> {
  /**
   * .what = the role this actor assumes
   */
  role: TRole;

  /**
   * .what = the brains this actor is allowed to use
   * .note = first brain is the default
   */
  brains: BrainRepl[];

  /**
   * .what = invokes a rigid skill with brain
   * .why = deterministic harness with probabilistic brain operations
   */
  act: ActorActOp<TRole>;

  /**
   * .what = invokes a solid skill via spawn
   * .why = deterministic shell execution, no brain
   */
  run: ActorRunOp<TRole>;

  /**
   * .what = starts a fluid conversation with the default brain
   * .why = open-ended exploration, brain decides path
   */
  ask: ActorAskOp;
}

export class Actor<TRole extends Role = Role>
  extends DomainEntity<Actor<TRole>>
  implements Actor<TRole>
{
  public static unique = ['role.slug'] as const;

  /**
   * .what = creates an Actor with preserved literal skill types from TRole
   * .why = enables type-safe .act(), .run(), .ask() invocation
   *
   * .note = use Actor.typed() instead of raw object cast for proper type preservation
   */
  public static typed<TRole extends Role>(input: Actor<TRole>): Actor<TRole> {
    return new Actor<TRole>(input);
  }
}
