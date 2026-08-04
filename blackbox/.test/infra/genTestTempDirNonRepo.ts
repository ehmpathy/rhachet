import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * .what = create an isolated temp dir that is NOT a git repo
 * .why =
 *   - some paths must be exercised from a cwd OUTSIDE any git repo (e.g. a git
 *     credential helper invoked from an arbitrary clone, or a non-repo dir) — the
 *     rhx CLI-wide bootstrap must tolerate a non-repo cwd (see
 *     rule.require.cli-tolerates-non-repo-cwd)
 *   - genTestTempRepo git-inits its dir, so it is a repo and cannot serve this case;
 *     this helper is its non-repo twin — the same os.tmpdir() isolation root, minus
 *     the git init — so tests do not inline mkdtempSync ad hoc
 *   - OS handles cleanup (no manual teardown)
 */
export const genTestTempDirNonRepo = (input?: {
  /** optional label woven into the dir name for legibility in a failure trace */
  label?: string;
}): { path: string } => {
  const prefix = input?.label ? `${input.label}-` : 'non-git-cwd-';
  const path = mkdtempSync(join(tmpdir(), prefix));
  return { path };
};
