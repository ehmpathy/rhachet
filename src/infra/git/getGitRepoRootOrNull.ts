import { getGitRepoRoot } from 'rhachet-artifact-git';

/**
 * .what = get the git repo root for a cwd, or null when the cwd is not a git repo
 * .why = a cli must be able to run from ANY cwd — even one that is not a git repo (e.g. a git
 *   credential helper invoked from a bare clone, or from no repo at all). a hard throw on
 *   "not a git repo" would make cwd matter when it must not. only the genuine "not a git repo"
 *   case yields null; every other fault (no git installed, a permission denial) propagates
 *   unchanged, so real problems still failfast (rule.forbid.failhide).
 *
 * .note = the benign message is matched case-insensitively across getGitRepoRoot versions —
 *   "Not inside a Git repository" (rhachet-artifact-git@1.1.5) and the older "not a git
 *   repository" both qualify.
 */
export const getGitRepoRootOrNull = async (input: {
  from: string;
}): Promise<string | null> =>
  getGitRepoRoot({ from: input.from }).catch((error) => {
    if (!(error instanceof Error)) throw error;
    // the one benign case: the cwd is simply not inside a git repo
    if (/not\s+(a|inside a)\s+git/i.test(error.message)) return null;
    // any other fault (git absent, permission denied) is a real problem — propagate it
    throw error;
  });
