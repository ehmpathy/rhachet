import { DomainEntity } from 'domain-objects';
import type { z } from 'zod';

import type { RoleSkill } from './RoleSkill';
import type { RoleTrait } from './RoleTrait';

/**
 * .what = type definition for a skill's schema (input/output zod schemas)
 * .why = enables type-safe skill invocation via .act() and .run()
 */
export interface RoleSkillSchema {
  input: z.ZodSchema;
  output: z.ZodSchema;
}

/**
 * .what = type for a record of skills with literal keys preserved
 * .why = enables type inference of skill names via keyof
 */
export type RoleSkillRegistry = { readonly [slug: string]: RoleSkillSchema };

/**
 * .what = defines a role that can have traits, know skills, and be instantiated across thread.context
 * .why =
 *   - enables registration of usable roles (e.g., 'mechanic', 'designer', 'architect', 'ecologist')
 *   - enables instantiation of thread.contexts
 *
 * .note = generic type parameters preserve literal skill names for type-safe invocation
 *   - TSolid: the solid skills record type (e.g., { 'wordcount': { input, output } })
 *   - TRigid: the rigid skills record type (e.g., { 'review': { input, output } })
 */
export interface Role<
  TSolid extends RoleSkillRegistry = RoleSkillRegistry,
  TRigid extends RoleSkillRegistry = RoleSkillRegistry,
> {
  /**
   * .what = a unique, readable identifier
   * .example = "mechanic"
   */
  slug: string; // short identifier, e.g., "caller"

  /**
   * .what = a display name for the role
   * .example = "Mechanic"
   */
  name: string;

  /**
   * .what = a brief on why this role exists
   * .why =
   *   - explain when and for what it should be used
   *   - sets what you can expect from it
   */
  purpose: string;

  /**
   * .what = reference to markdown file that explains more about the role
   * .why =
   *   - give detail about what it does and how it does it
   */
  readme: { uri: string };

  /**
   * .what = the traits inherent to the role
   * .why = declares how the role goes about things
   */
  traits: RoleTrait[];

  /**
   * .what = the skills known by the role
   * .why = declares what the role can do
   * .how =
   *   - solid: typed skills for deterministic execution (no brain)
   *     - enables type-safe .run() invocation
   *   - rigid: typed skills for deterministic harness with brain operations
   *     - enables type-safe .act() invocation
   *   - dirs: directory-based skills (e.g., .sh scripts) for linking/booting
   *     - single { uri: string }: symlinks this dir as the full skills dir
   *     - array { uri: string }[]: symlinks each dir within the skills dir
   *   - refs: programmatic RoleSkill references for execution
   */
  skills: {
    /**
     * .what = solid skills (deterministic, no brain)
     * .why = type-safe .run() invocation
     */
    solid?: TSolid;

    /**
     * .what = rigid skills (deterministic harness, brain operations)
     * .why = type-safe .act() invocation
     */
    rigid?: TRigid;

    dirs: { uri: string } | { uri: string }[];
    refs: RoleSkill<any>[];
  };

  /**
   * .what = the briefs curated for this role
   * .why = declares the library of knowledge this role can and should leverage
   *   - enables reuse of the briefs, independent from the skills
   * .how =
   *   - dirs: directory-based briefs for linking/booting
   *     - single { uri: string }: symlinks this dir as the full briefs dir
   *     - array { uri: string }[]: symlinks each dir within the briefs dir
   */
  briefs: { dirs: { uri: string } | { uri: string }[] };

  /**
   * .what = initialization resources and commands for this role
   * .why = declares setup actions that should run once when instantiating a role
   * .how =
   *   - dirs: directory-based init scripts for linking (same pattern as briefs/skills)
   *     - single { uri: string }: symlinks this dir as the full inits dir
   *     - array { uri: string }[]: symlinks each dir within the inits dir
   *   - exec: commands to execute when `npx rhachet roles init` is run
   */
  inits?: {
    dirs?: { uri: string } | { uri: string }[];
    exec?: { cmd: string }[];
  };
}
export class Role<
    TSolid extends RoleSkillRegistry = RoleSkillRegistry,
    TRigid extends RoleSkillRegistry = RoleSkillRegistry,
  >
  extends DomainEntity<Role<TSolid, TRigid>>
  implements Role<TSolid, TRigid>
{
  public static unique = ['slug'] as const;

  /**
   * .what = creates a Role with preserved literal skill names
   * .why = enables type-safe skill invocation via genActor
   *
   * .note = use Role.typed() instead of new Role() to preserve literal types
   */
  public static typed<
    TSolid extends RoleSkillRegistry,
    TRigid extends RoleSkillRegistry,
  >(input: Role<TSolid, TRigid>): Role<TSolid, TRigid> {
    return new Role<TSolid, TRigid>(input);
  }
}
