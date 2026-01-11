import { DomainLiteral } from 'domain-objects';

import type { RoleSkillSchema } from './Role';
import type { RoleSkillExecutable } from './RoleSkillExecutable';

/**
 * .what = a role skill that has been resolved and can be acted upon
 * .why =
 *   - unified return type for skill resolution
 *   - explicit domain object for skill invocation
 *   - actors use this to invoke skills via .act() and .run()
 *
 * .note = executable is required; ActorRoleSkill is only constructable
 *   when a skill executable has been found
 * .note = TOutput generic enables type flow through schema.output
 */
export interface ActorRoleSkill<TOutput = unknown> {
  /**
   * .what = the skill's slug identifier
   */
  slug: string;

  /**
   * .what = the thought route for this skill
   * .note = solid = deterministic, rigid = brain-augmented
   */
  route: 'solid' | 'rigid';

  /**
   * .what = where this skill was resolved from
   * .note = role.skills takes precedence over .agent/ discovery
   */
  source: 'role.skills' | '.agent/';

  /**
   * .what = the zod schema for input/output validation
   * .note = required; skills must have schemas to be executable via actor contracts
   * .note = output schema is typed to TOutput for type flow
   */
  schema: RoleSkillSchema<TOutput>;

  /**
   * .what = the executable file for this skill
   * .note = required; skill cannot be acted upon without an executable
   */
  executable: RoleSkillExecutable;
}
export class ActorRoleSkill
  extends DomainLiteral<ActorRoleSkill>
  implements ActorRoleSkill {}
