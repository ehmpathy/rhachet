import { genTempDirPhysical } from './genTempDirPhysical';

/**
 * .what = create an isolated temp dir that is NOT a git repo
 * .why =
 *   - some paths must be exercised from a cwd OUTSIDE any git repo (e.g. a git
 *     credential helper invoked from an arbitrary clone, or a non-repo dir) — the
 *     rhx CLI-wide bootstrap must tolerate a non-repo cwd (see
 *     rule.require.cli-tolerates-non-repo-cwd)
 *   - genTestTempRepo git-inits its dir, so it is a repo and cannot serve this case;
 *     this helper is its non-repo twin — the same physical /tmp isolation root,
 *     minus the git init — so tests do not inline mkdtempSync ad hoc
 *
 * .note.cleanup = allocated via genTempDir, so the run that made it reclaims it at
 *   its jest globalTeardown (test-fns autoprune) — under a failure or a --scope too.
 *   a per-process `exit` hook cannot serve: jest kills its workers, so the hook never
 *   fires (rule.require.test-tempdir-via-gentempdir)
 */
export const genTestTempDirNonRepo = (input?: {
  /** optional label woven into the dir name for legibility in a failure trace */
  label?: string;
}): { path: string } => {
  const path = genTempDirPhysical({ slug: input?.label ?? 'non-git-cwd' });
  return { path };
};
