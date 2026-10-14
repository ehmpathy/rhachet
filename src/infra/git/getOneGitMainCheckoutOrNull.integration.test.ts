import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneGitMainCheckoutOrNull } from './getOneGitMainCheckoutOrNull';

describe('getOneGitMainCheckoutOrNull', () => {
  given('[case1] a standard repo, with a `.git` dir', () => {
    const scene = useBeforeAll(async () => {
      const repoRoot = realpathSync(genTempDir({ slug: 'git-main-standard' }));
      mkdirSync(join(repoRoot, '.git'));
      return { repoRoot };
    });

    when('[t0] the main checkout is read', () => {
      then('it is the repo root itself', () => {
        expect(
          getOneGitMainCheckoutOrNull({ repoRoot: scene.repoRoot }),
        ).toEqual(scene.repoRoot);
      });
    });
  });

  given(
    '[case2] a worktree, with a `.git` file that points at the main checkout',
    () => {
      const scene = useBeforeAll(async () => {
        const repoRoot = realpathSync(
          genTempDir({ slug: 'git-main-worktree' }),
        );
        writeFileSync(
          join(repoRoot, '.git'),
          'gitdir: /home/someone/git/org/repo/.git/worktrees/repo.fix-blend\n',
        );
        return { repoRoot };
      });

      when('[t0] the main checkout is read', () => {
        then('it is the main checkout the gitdir names', () => {
          expect(
            getOneGitMainCheckoutOrNull({ repoRoot: scene.repoRoot }),
          ).toEqual('/home/someone/git/org/repo');
        });
      });
    },
  );

  given('[case3] a submodule, whose `.git` file points into modules', () => {
    const scene = useBeforeAll(async () => {
      const repoRoot = realpathSync(genTempDir({ slug: 'git-main-submodule' }));
      writeFileSync(
        join(repoRoot, '.git'),
        'gitdir: /home/someone/git/org/repo/.git/modules/sub\n',
      );
      return { repoRoot };
    });

    when('[t0] the main checkout is read', () => {
      then('there is no main checkout to name', () => {
        expect(
          getOneGitMainCheckoutOrNull({ repoRoot: scene.repoRoot }),
        ).toEqual(null);
      });
    });
  });

  given('[case4] a dir with no `.git`', () => {
    const scene = useBeforeAll(async () => {
      const repoRoot = realpathSync(genTempDir({ slug: 'git-main-none' }));
      return { repoRoot };
    });

    when('[t0] the main checkout is read', () => {
      then('it is null', () => {
        expect(
          getOneGitMainCheckoutOrNull({ repoRoot: scene.repoRoot }),
        ).toEqual(null);
      });
    });
  });
});
