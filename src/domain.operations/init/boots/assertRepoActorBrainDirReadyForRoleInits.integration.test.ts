import { ConstraintError } from 'helpful-errors';
import { genTempDir, getError, given, then, when } from 'test-fns';

import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';

import { chmodSync, mkdirSync, realpathSync, symlinkSync } from 'node:fs';
import { join, relative } from 'node:path';
import { assertRepoActorBrainDirReadyForRoleInits } from './assertRepoActorBrainDirReadyForRoleInits';

/**
 * .what = a fresh git repo with its repo actor brain dir on disk
 */
const genRepoScene = (input: { slug: string }) => {
  const repoPath = realpathSync(genTempDir({ slug: input.slug, git: true }));
  const repoActorBrainDir = getBrainOndiskDir({
    actorDir: getOneRepoActorOndiskDir({ repoPath }),
  });
  mkdirSync(repoActorBrainDir, { recursive: true });
  return { repoPath, repoActorBrainDir };
};

describe('assertRepoActorBrainDirReadyForRoleInits', () => {
  given(
    '[case1] a writable brain dir, reached by a link that lands on it',
    () => {
      when('[t0] the repo is checked', () => {
        then('it passes', () => {
          const scene = genRepoScene({ slug: 'ready-for-inits-ok' });
          symlinkSync(
            relative(scene.repoPath, scene.repoActorBrainDir),
            join(scene.repoPath, '.claude'),
          );
          expect(() =>
            assertRepoActorBrainDirReadyForRoleInits({
              repoPath: scene.repoPath,
            }),
          ).not.toThrow();
        });
      });
    },
  );

  given('[case2] a brain dir this process cannot write (vision case 2)', () => {
    when('[t0] the repo is checked', () => {
      then('it refuses with the write probe', async () => {
        // a root process writes past a 0o555 mode, so this case cannot hold under root
        if (process.getuid?.() === 0)
          throw new ConstraintError('this test cannot run as root', {
            hint: 'run the suite as a non-root user',
          });
        const scene = genRepoScene({ slug: 'ready-for-inits-readonly' });
        chmodSync(scene.repoActorBrainDir, 0o555);
        const error = await getError(async () =>
          assertRepoActorBrainDirReadyForRoleInits({
            repoPath: scene.repoPath,
          }),
        ).finally(() => chmodSync(scene.repoActorBrainDir, 0o755));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('not writable');
      });
    });
  });

  given(
    '[case3] <repo>/.claude is a link to another place (vision case 4)',
    () => {
      when('[t0] the repo is checked', () => {
        then('it refuses with the link check', async () => {
          const scene = genRepoScene({ slug: 'ready-for-inits-foreign' });
          mkdirSync(join(scene.repoPath, 'other'));
          symlinkSync('other', join(scene.repoPath, '.claude'));
          const error = await getError(async () =>
            assertRepoActorBrainDirReadyForRoleInits({
              repoPath: scene.repoPath,
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('a symlink to another place');
        });
      });
    },
  );
});
