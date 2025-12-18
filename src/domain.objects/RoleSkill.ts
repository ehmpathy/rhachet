import { DomainEntity } from 'domain-objects';

import type {
  RoleSkillContextGetter,
  RoleSkillThreadsGetter,
} from './RoleSkillArgGetter';
import type { GStitcher, Stitcher } from './Stitcher';

/**
 * .what = a skill is an action a role can perform; a route it can weave
 * .why =
 *   - defines a reusable skill you can ask a role to perform
 *   - usable for skill invocation, e.g., via the cli
 */
export interface RoleSkill<TStitcher extends GStitcher> {
  /**
   * .what = short, unique identifier
   * .example = "summarize"
   */
  slug: string;

  /**
   * .what = a full description of the skill
   * .why = explains what can be expected, how to use it, and details of operation
   * .note =
   *   - the first two lines of the readme will be used as a description
   */
  readme: string;

  /**
   * .what = the route via which the skill is executable
   */
  route: Stitcher<TStitcher>;

  /**
   * .what = how to instantiate the threads for this skill
   */
  threads: RoleSkillThreadsGetter<TStitcher['threads'], any>;

  /**
   * .what = how to instantiate the context for this skill
   */
  context: RoleSkillContextGetter<TStitcher['context'], any>;
}
export class RoleSkill<TStitcher extends GStitcher>
  extends DomainEntity<RoleSkill<TStitcher>>
  implements RoleSkill<TStitcher>
{
  public static unique = ['slug'] as const;
}
