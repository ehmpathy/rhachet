import { getError, given, then, when } from 'test-fns';

import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getGitRepoRootOrNull } from './getGitRepoRootOrNull';

/**
 * .what = clamp: getGitRepoRootOrNull yields null for a non-git cwd (never throws), and yields
 *   a real root inside a git repo.
 * .why = a cli (keyrack get/unlock, and the cli-wide genContextCli bootstrap) must run from a
 *   cwd that is not a git repo. the no-repo case is benign, so it yields null and never exits 1.
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

  given('[case3] a worktree nested inside its main repo', () => {
    // a main repo (`.git` dir) that holds a worktree (`.git` file) two levels down
    const mainRoot = mkdtempSync(join(tmpdir(), 'get-git-root-nested-'));
    const worktreeRoot = join(mainRoot, '.claude', 'worktrees', 'feat');
    mkdirSync(join(mainRoot, '.git'));
    mkdirSync(join(worktreeRoot, 'src'), { recursive: true });
    writeFileSync(
      join(worktreeRoot, '.git'),
      `gitdir: ${mainRoot}/.git/worktrees/feat\n`,
    );

    when('[t0] the root is asked for from a dir within the worktree', () => {
      then(
        'it is the worktree root, never the enclosing main repo',
        async () => {
          const root = await getGitRepoRootOrNull({
            from: join(worktreeRoot, 'src'),
          });
          expect(root).toEqual(worktreeRoot);
        },
      );
    });

    when('[t1] the root is asked for from a dir of the main repo', () => {
      then('it is the main repo root', async () => {
        const root = await getGitRepoRootOrNull({
          from: join(mainRoot, '.claude'),
        });
        expect(root).toEqual(mainRoot);
      });
    });
  });

  given('[case4] a cwd under a dir the walk cannot read', () => {
    // a dir with no permissions: a stat of any path inside it fails with EACCES, not ENOENT
    const lockedDir = mkdtempSync(join(tmpdir(), 'get-git-root-locked-'));
    chmodSync(lockedDir, 0o000);
    afterAll(() => chmodSync(lockedDir, 0o700));

    when('[t0] the root is asked for from inside it', () => {
      then('it fails loud with EACCES, never a silent "no repo"', async () => {
        const error = await getError(
          getGitRepoRootOrNull({ from: join(lockedDir, 'inner') }),
        );
        expect(error).toHaveProperty('code', 'EACCES');
      });
    });
  });
});
