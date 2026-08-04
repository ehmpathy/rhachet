import { DomainLiteral } from 'domain-objects';

import { getGitRepoRootOrNull } from '@src/infra/git/getGitRepoRootOrNull';

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
  // a cli must run from ANY cwd — even one that is not a git repo (a credential helper from a
  // bare clone). when there is no repo, the cwd itself is the root: repo-level config discovery
  // then finds no repo config there, which is correct — a non-repo cwd has none to find.
  const gitroot =
    (await getGitRepoRootOrNull({ from: input.cwd })) ?? input.cwd;
  return new ContextCli({ cwd: input.cwd, gitroot });
};
