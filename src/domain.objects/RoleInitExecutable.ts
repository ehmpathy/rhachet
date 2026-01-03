import { DomainLiteral } from 'domain-objects';

/**
 * .what = represents a discovered executable init file from a role directory
 * .why = enables init discovery and execution via `rhachet roles init --command`
 */
export interface RoleInitExecutable {
  /**
   * .what = init identifier derived from relative path
   * .example = "claude.hooks/sessionstart.notify-permissions", "init.claude"
   */
  slug: string;

  /**
   * .what = absolute path to the executable file
   */
  path: string;

  /**
   * .what = the repo (registry) this init belongs to
   * .example = "ehmpathy", ".this"
   */
  slugRepo: string;

  /**
   * .what = the role this init belongs to
   * .example = "mechanic", "designer"
   */
  slugRole: string;
}
export class RoleInitExecutable
  extends DomainLiteral<RoleInitExecutable>
  implements RoleInitExecutable
{
  public static unique = ['slugRepo', 'slugRole', 'slug'] as const;
}
