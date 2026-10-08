import { genTempDir, getError, given, then, when } from 'test-fns';

import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneGitRepoRootSync } from './getOneGitRepoRootSync';

/**
 * .what = clamps the `.git` probe of the sync root walk
 * .why = a worktree's `.git` is a FILE, and a faulted `.git` must escape rather than be climbed
 *        past — the two edges an `existsSync` probe or an `isDirectory` probe each get wrong
 *
 * .note = genTempDir is repo-scoped, so an ancestor of each scene carries this repo's `.git`.
 *   each case below must therefore stop AT its scene dir — a walk that climbs past it lands on
 *   the outer repo, which is the defect the assertions catch
 */
describe('getOneGitRepoRootSync', () => {
  given('[case1] a dir whose `.git` is a file, as in a worktree', () => {
    when('[t0] the walk starts in a nested dir', () => {
      then('the root is the dir that holds the `.git` file', () => {
        const dir = genTempDir({ slug: 'getOneGitRepoRootSync-c1t0' });
        writeFileSync(
          join(dir, '.git'),
          'gitdir: /elsewhere/.git/worktrees/x\n',
        );
        mkdirSync(join(dir, 'src', 'deep'), { recursive: true });

        const root = getOneGitRepoRootSync({ from: join(dir, 'src', 'deep') });
        expect(root).toEqual(dir);
      });
    });
  });

  given('[case2] a dir whose `.git` is a symlink cycle', () => {
    when('[t0] the walk reaches it', () => {
      then('the fault escapes, never climbed past as absence', async () => {
        // a statSync call site → the two-link cycle (ELOOP) is the fixture that bites
        //   (define.statsync-and-lstatsync-suppress-different-errnos)
        const dir = genTempDir({ slug: 'getOneGitRepoRootSync-c2t0' });
        symlinkSync(join(dir, '.git.b'), join(dir, '.git'));
        symlinkSync(join(dir, '.git'), join(dir, '.git.b'));

        const error = await getError(() =>
          getOneGitRepoRootSync({ from: dir }),
        );
        expect((error as NodeJS.ErrnoException).code).toEqual('ELOOP');
      });
    });
  });

  given('[case3] a dir with no `.git` of its own', () => {
    when('[t0] the walk starts there', () => {
      then('it climbs to the nearest ancestor that holds one', () => {
        const outer = genTempDir({ slug: 'getOneGitRepoRootSync-c3t0' });
        writeFileSync(join(outer, '.git'), 'gitdir: /elsewhere\n');
        mkdirSync(join(outer, 'inner'), { recursive: true });

        const root = getOneGitRepoRootSync({ from: join(outer, 'inner') });
        expect(root).toEqual(outer);
      });
    });
  });
});
