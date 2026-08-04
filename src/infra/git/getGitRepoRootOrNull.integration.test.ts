import { given, then, when } from 'test-fns';

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getGitRepoRootOrNull } from './getGitRepoRootOrNull';

/**
 * .what = clamp: getGitRepoRootOrNull yields null for a non-git cwd (never throws), and yields
 *   a real root inside a git repo.
 * .why = the F7 defect: a cli (keyrack get/unlock, and the cli-wide genContextCli bootstrap)
 *   must run from a cwd that is not a git repo. getGitRepoRoot throws "Not inside a Git
 *   repository" there; the earlier catch matched a stale lowercase "not a git" fragment, so it
 *   rethrew and the command exited 1. this clamps that the benign no-repo case becomes null
 *   across the real getGitRepoRoot error message.
 *
 * .note = the non-repo dir is made under os.tmpdir() (NOT genTempDir, which is repo-scoped and
 *   therefore always inside this git repo — useless for a "not a git repo" probe). this mirrors
 *   genTestTempRepo's own use of tmpdir() for isolated, outside-the-repo workspaces.
 */
describe('getGitRepoRootOrNull (integration)', () => {
  given('[case1] a cwd that is NOT inside a git repo', () => {
    // a bare dir under the OS temp root — outside any git repo, never git-inited
    const nonRepoCwd = mkdtempSync(join(tmpdir(), 'get-git-root-or-null-'));

    when('[t0] the root is asked for', () => {
      then('it is null (the benign no-repo case, never a throw)', async () => {
        const root = await getGitRepoRootOrNull({ from: nonRepoCwd });
        expect(root).toBeNull();
      });
    });
  });

  given('[case2] a cwd that IS inside a git repo (this repo)', () => {
    when('[t0] the root is asked for', () => {
      then('it is a real path string, not null', async () => {
        const root = await getGitRepoRootOrNull({ from: process.cwd() });
        expect(typeof root).toEqual('string');
        expect(root).not.toBeNull();
      });
    });
  });
});
