import { DomainLiteral } from 'domain-objects';
import { getGitRepoRoot } from 'rhachet-artifact-git';

/**
 * .what = context for CLI operations
 * .why = standardizes cwd and gitroot across domain operations
 */
export interface ContextCli {
  /**
   * .what = current work directory
   * .why = where the command was invoked from
   */
  cwd: string;

  /**
   * .what = git repository root path
   * .why = resolved from cwd, used for repo-level operations
   */
  gitroot: string;
}
export class ContextCli
  extends DomainLiteral<ContextCli>
  implements ContextCli
{
  public static unique = ['cwd'] as const;
}

/**
 * .what = creates a ContextCli instance with resolved gitroot
 * .why = provides consistent instantiation with auto-resolved gitroot
 */
export const genContextCli = async (input: {
  cwd: string;
}): Promise<ContextCli> => {
  const gitroot = await getGitRepoRoot({ from: input.cwd });
  return new ContextCli({ cwd: input.cwd, gitroot });
};
