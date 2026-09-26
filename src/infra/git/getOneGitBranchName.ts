import { execFileSync } from 'node:child_process';

/**
 * .what = read the current git branch name for a worktree, or null when there is
 *         none to name (detached HEAD, or not a git worktree)
 * .why  = the unlock prompt names the TREE that minted the request as `repo · branch`
 *         (rule.forbid.contextless-unlock-prompt); the branch is the half that names
 *         the exact checkout, not just the project
 *
 * .note = argv-only (never a shell string), so a path can never be read as shell
 *         syntax; run against the given gitroot via `cwd`
 * .note = a numeric git exit (detached HEAD prints `HEAD`, or not-a-repo) is the
 *         expected "no branch to name" outcome → null, never a throw. a spawn fault
 *         (git absent) has no numeric status and surfaces loud (rule.forbid.failhide)
 */
export const getOneGitBranchName = (input: {
  gitroot: string;
}): string | null => {
  try {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: input.gitroot,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();
    // a detached HEAD prints the literal `HEAD` — no branch to name
    if (!branch || branch === 'HEAD') return null;
    return branch;
  } catch (error) {
    // a numeric git exit = ran + no branch (not a repo, etc) → null; a spawn fault
    // (git absent, no numeric status) surfaces loud
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      typeof (error as { status: unknown }).status === 'number'
    )
      return null;
    throw error;
  }
};
