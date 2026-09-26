import { statSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * .what = get the git repo root for a cwd, or null when the cwd is not a git repo
 * .why = a cli must be able to run from ANY cwd — even one that is not a git repo (e.g. a git
 *   credential helper invoked from a bare clone, or from no repo at all). a hard throw on
 *   "not a git repo" would make cwd matter when it must not.
 *
 * .note = the root is the dir of the NEAREST `.git`, a directory (a standard repo) or a file (a
 *   worktree, whose `.git` file points at the main repo) — the same rule git applies. so a
 *   worktree nested inside its main repo resolves to itself, never to the outer repo
 * .note = a walk over `statSync`, with no package import: every cli call resolves the root, so
 *   this sits on the hot path, and a package barrel here once cost ~570 module loads per call
 *   (rule.require.thinnest-import-path)
 */
export const getGitRepoRootOrNull = async (input: {
  from: string;
}): Promise<string | null> => {
  // the nearest `.git` marks the root; the filesystem root has no parent to climb to
  if (isGitMarkerPresent({ dir: input.from })) return input.from;
  const parent = dirname(input.from);
  if (parent === input.from) return null;
  return getGitRepoRootOrNull({ from: parent });
};

/**
 * .what = whether `<dir>/.git` is present
 * .why = only an absent marker means "climb"; any other errno (EACCES, ELOOP) is a real fault,
 *   and a walk that read it as absent would hide it as "not a git repo" (rule.forbid.failhide)
 */
const isGitMarkerPresent = (input: { dir: string }): boolean => {
  try {
    statSync(join(input.dir, '.git'));
    return true;
  } catch (error) {
    // absent, or a path segment that is a file: both mean "no marker here"
    //   .note = a structural check, since an fs error may come from another realm than `Error`
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? error.code
        : null;
    if (code === 'ENOENT' || code === 'ENOTDIR') return false;
    throw error;
  }
};
