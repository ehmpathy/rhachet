import { ThreadContextRole, ThreadRole } from './Threads';

/**
 * .what = a resolved RoleTrait, accessible in a thread's context
 * .why = defines the default mindset or behavioral axioms that persist across all tasks performed in the role
 * .examples =
 *   - treat ubiquitous language as top priority
 *   - treat consistency as top priority
 *   - prefer given/when/then test suites
 * todo:
 *   - ensure that traits are always leveraged in every template that uses a role'd thread?
 */
export interface RoleContextTrait {
  content: string;
}

/**
 * .what = a reference to a skill which is learned and accessible to any actor which assumes the role
 * .why = enables agents to perform tasks within the role using repeatable methods, patterns, or strategies
 * .cases =
 *   - domain distillation is a process where you extract domain terms and clarify their relationships; here's how to use
 *   - given/when/then enables test suites with behavior-driven structure; here's how to use
 * todo:
 *   - update this to a shape that actually helps dynamic subskill execution, once we get to fluid routes
 */
export interface RoleContextSkill {
  content: string;
}

/**
 * .what = the context that each role carries with it
 * .why = provides each role with a set of traits (inherent truths) and skills (learned abilities) to influence how they approach decisions, actions, and interpretations
 */
export interface RoleContext<
  TRole extends ThreadRole,
  TStash extends Record<string, any> | undefined,
> extends ThreadContextRole<TRole> {
  role: TRole;

  /**
   * .what = the persistent traits and skills that define how this role behaves
   * .why  = allows role-specific behavior, reasoning styles, and tool usage to persist across steps
   */
  inherit: {
    traits: RoleContextTrait[];
    skills: RoleContextSkill[];
  };

  /**
   * .what = short-lived or dynamic data needed for the current task
   * .why  = gives the thread situational context without polluting long-term role identity
   */
  stash: TStash;
}
