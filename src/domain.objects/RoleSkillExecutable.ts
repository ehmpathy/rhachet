import { DomainLiteral } from 'domain-objects';

/**
 * .what = represents a discovered executable skill file from a role directory
 * .why = enables skill discovery and execution via `rhachet run --skill`
 */
export interface RoleSkillExecutable {
  /**
   * .what = skill identifier derived from filename
   * .example = "init.bhuild", "git.worktree"
   */
  slug: string;

  /**
   * .what = absolute path to the executable file
   */
  path: string;

  /**
   * .what = the repo (registry) this skill belongs to
   * .example = "ehmpathy", ".this"
   */
  repoSlug: string;

  /**
   * .what = the role this skill belongs to
   * .example = "mechanic", "designer"
   */
  roleSlug: string;
}
export class RoleSkillExecutable
  extends DomainLiteral<RoleSkillExecutable>
  implements RoleSkillExecutable
{
  public static unique = ['repoSlug', 'roleSlug', 'slug'] as const;
}
