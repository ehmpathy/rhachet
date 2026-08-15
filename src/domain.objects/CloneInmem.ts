import { DomainEntity } from 'domain-objects';
import type { z } from 'zod';

import type { ActorBrain, SkillInput, SkillOutput } from './ActorInmem';
import type { BrainOutput } from './BrainOutput';
import type { BrainRepl } from './BrainRepl';
import type { Role } from './Role';

/**
 * .what = the union of rigid skill-maps across a role list
 * .why = a clone's .act() must accept any rigid skill from ANY of its roles
 */
export type RigidSkillsOfRoles<TRoles extends Role[]> = NonNullable<
  TRoles[number]['skills']['rigid']
>;

/**
 * .what = the union of solid skill-maps across a role list
 * .why = a clone's .run() must accept any solid skill from ANY of its roles
 */
export type SolidSkillsOfRoles<TRoles extends Role[]> = NonNullable<
  TRoles[number]['skills']['solid']
>;

/**
 * .what = the UNION of keys across a union of maps
 * .why = plain `keyof (A | B)` yields the key INTERSECTION; a clone must see
 *   the union of every role's skill slugs, so distribute keyof over the union
 */
export type KeysOfUnion<T> = T extends unknown ? keyof T : never;

/**
 * .what = look up one slug's schema across a union of skill-maps
 * .why = the slug lives on exactly one role's map; distribute the lookup so
 *   the correct schema is found regardless of which role owns the slug
 */
export type SkillSchemaAt<
  TSkills,
  TSlug extends PropertyKey,
> = TSkills extends unknown
  ? TSlug extends keyof TSkills
    ? TSkills[TSlug]
    : never
  : never;

/**
 * .what = type for clone.act()
 * .why = type-safe rigid skill invocation across the actor's role list
 */
export type CloneActOp<TRoles extends Role[]> = <
  TSkillSlug extends KeysOfUnion<RigidSkillsOfRoles<TRoles>>,
  TContext = unknown,
>(
  input: {
    brain?: { repo: string; slug: string } | BrainRepl;
    skill: {
      [K in TSkillSlug]: SkillInput<
        SkillSchemaAt<RigidSkillsOfRoles<TRoles>, K>
      >;
    };
  },
  context?: TContext,
) => Promise<
  BrainOutput<
    SkillOutput<SkillSchemaAt<RigidSkillsOfRoles<TRoles>, TSkillSlug>>
  >
>;

/**
 * .what = type for clone.run()
 * .why = type-safe solid skill invocation across the actor's role list
 */
export type CloneRunOp<TRoles extends Role[]> = <
  TSkillSlug extends KeysOfUnion<SolidSkillsOfRoles<TRoles>>,
>(input: {
  skill: {
    [K in TSkillSlug]: SkillInput<SkillSchemaAt<SolidSkillsOfRoles<TRoles>, K>>;
  };
}) => Promise<
  SkillOutput<SkillSchemaAt<SolidSkillsOfRoles<TRoles>, TSkillSlug>>
>;

/**
 * .what = type for clone.ask()
 * .why = fluid conversation with the default brain
 */
export type CloneAskOp = <TOutput, TContext = unknown>(
  input: {
    prompt: string;
    schema: { output: z.Schema<TOutput> };
  },
  context?: TContext,
) => Promise<BrainOutput<TOutput>>;

/**
 * .what = the in-mem CLONE — a live embodiment baked from an actor, engageable
 *   via .act()/.run()/.ask()
 * .why =
 *   - the actor (ActorInmem) is the recipe; the clone is what you engage
 *   - .act() invokes rigid skills (deterministic harness, brain augments)
 *   - .run() invokes solid skills (deterministic, no brain)
 *   - .ask() starts fluid conversation with the default brain
 *
 * .note = partition = in-mem (the SDK grain). the on-disk clone record is
 *   CloneOndisk. see define.actor-clone-partitions.md — contracts speak the
 *   bare `Clone`; the `Inmem` suffix is the internal partition marker.
 */
export interface CloneInmem<TRoles extends Role[] = Role[]> {
  /**
   * .what = the roles this clone's actor composes
   */
  roles: TRoles;

  /**
   * .what = the brains this clone is allowed to use
   * .note = first brain is the default
   */
  brains: ActorBrain[];

  /**
   * .what = invokes a rigid skill with a brain
   */
  act: CloneActOp<TRoles>;

  /**
   * .what = invokes a solid skill via spawn, no brain
   */
  run: CloneRunOp<TRoles>;

  /**
   * .what = starts a fluid conversation with the default brain
   */
  ask: CloneAskOp;
}

export class CloneInmem<TRoles extends Role[] = Role[]>
  extends DomainEntity<CloneInmem<TRoles>>
  implements CloneInmem<TRoles>
{
  /**
   * .what = creates a CloneInmem with preserved literal role types from TRoles
   * .why = enables type-safe .act()/.run()/.ask() invocation
   */
  public static typed<TRoles extends Role[]>(
    input: CloneInmem<TRoles>,
  ): CloneInmem<TRoles> {
    return new CloneInmem<TRoles>(input);
  }
}
