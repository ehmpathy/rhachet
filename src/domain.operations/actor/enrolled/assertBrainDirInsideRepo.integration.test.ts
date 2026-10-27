import { genTempDir, getError, given, then, when } from 'test-fns';

import { mkdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { assertBrainDirInsideRepo } from './assertBrainDirInsideRepo';
import { BrainDirOutsideRepoError } from './BrainDirOutsideRepoError';

describe('assertBrainDirInsideRepo', () => {
  given('[case1] a brain dir that sits inside the repo', () => {
    when('[t0] the dir is on disk', () => {
      then('it passes', () => {
        const repoPath = genTempDir({ slug: 'guard-inside' });
        const brainDir = join(repoPath, '.agent/.actors/a/brain/.claude');
        mkdirSync(brainDir, { recursive: true });
        expect(() =>
          assertBrainDirInsideRepo({ repoPath, brainDir }),
        ).not.toThrow();
      });
    });

    when('[t1] the dir is not yet on disk', () => {
      then('it passes, measured at the nearest extant ancestor', () => {
        const repoPath = genTempDir({ slug: 'guard-absent' });
        const brainDir = join(repoPath, '.agent/.actors/a/brain/.claude');
        expect(() =>
          assertBrainDirInsideRepo({ repoPath, brainDir }),
        ).not.toThrow();
      });
    });

    when('[t2] the repo itself is reached through a symlinked parent', () => {
      then('it passes, since both sides are realpaths', () => {
        const repoReal = genTempDir({ slug: 'guard-repo-real' });
        const linkParent = genTempDir({ slug: 'guard-repo-link' });
        const repoPath = join(linkParent, 'repo');
        symlinkSync(repoReal, repoPath);
        const brainDir = join(repoPath, '.agent/.actors/a/brain/.claude');
        mkdirSync(brainDir, { recursive: true });
        expect(() =>
          assertBrainDirInsideRepo({ repoPath, brainDir }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] a brain dir that links out of the repo', () => {
    when('[t0] the dir is a symlink to an outside dir', () => {
      then(
        'it refuses with the path, where it lands, and the fix',
        async () => {
          const repoPath = genTempDir({ slug: 'guard-outside-repo' });
          const outside = genTempDir({ slug: 'guard-outside-target' });
          const brainDir = join(repoPath, '.agent/.actors/a/brain/.claude');
          mkdirSync(join(repoPath, '.agent/.actors/a/brain'), {
            recursive: true,
          });
          symlinkSync(outside, brainDir);
          const error = await getError(async () =>
            assertBrainDirInsideRepo({ repoPath, brainDir }),
          );
          expect(error).toBeInstanceOf(BrainDirOutsideRepoError);
          expect((error as BrainDirOutsideRepoError).metadata).toMatchObject({
            path: '.agent/.actors/a/brain/.claude',
            hint: 'point that dir, or the link above it, back inside the repo, then rerun `rhx init --hooks`',
          });
        },
      );
    });

    when(
      '[t1] an ancestor of an absent brain dir links out of the repo',
      () => {
        then('it refuses, since a mkdir would create it outside', async () => {
          const repoPath = genTempDir({ slug: 'guard-ancestor-repo' });
          const outside = genTempDir({ slug: 'guard-ancestor-target' });
          mkdirSync(join(repoPath, '.agent'), { recursive: true });
          symlinkSync(outside, join(repoPath, '.agent/.actors'));
          const brainDir = join(repoPath, '.agent/.actors/a/brain/.claude');
          const error = await getError(async () =>
            assertBrainDirInsideRepo({ repoPath, brainDir }),
          );
          expect(error).toBeInstanceOf(BrainDirOutsideRepoError);
        });
      },
    );
  });
});
