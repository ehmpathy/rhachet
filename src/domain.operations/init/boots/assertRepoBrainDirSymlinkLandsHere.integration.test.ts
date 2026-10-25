import { ConstraintError } from 'helpful-errors';
import { genTempDir, getError, given, then, when } from 'test-fns';

import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';

import { mkdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { assertRepoBrainDirSymlinkLandsHere } from './assertRepoBrainDirSymlinkLandsHere';

/**
 * .what = a fresh git repo with its repo actor brain dir on disk
 */
const genRepoScene = (input: { slug: string }) => {
  const repoPath = realpathSync(genTempDir({ slug: input.slug, git: true }));
  const repoActorBrainDir = getBrainOndiskDir({
    actorDir: getOneRepoActorOndiskDir({ repoPath }),
  });
  mkdirSync(repoActorBrainDir, { recursive: true });
  return { repoPath, repoActorBrainDir, linkPath: join(repoPath, '.claude') };
};

describe('assertRepoBrainDirSymlinkLandsHere', () => {
  given('[case1] <repo>/.claude is absent', () => {
    when('[t0] the link is checked', () => {
      then('it passes', () => {
        const scene = genRepoScene({ slug: 'lands-here-absent' });
        expect(() => assertRepoBrainDirSymlinkLandsHere(scene)).not.toThrow();
      });
    });
  });

  given('[case2] <repo>/.claude is a real dir', () => {
    when('[t0] the link is checked', () => {
      then('it passes, since the layout step migrates it', () => {
        const scene = genRepoScene({ slug: 'lands-here-dir' });
        mkdirSync(scene.linkPath);
        expect(() => assertRepoBrainDirSymlinkLandsHere(scene)).not.toThrow();
      });
    });
  });

  given('[case3] <repo>/.claude lands on the brain dir (vision case 6)', () => {
    when('[t0] the link is relative', () => {
      then('it passes', () => {
        const scene = genRepoScene({ slug: 'lands-here-relative' });
        symlinkSync(
          relative(scene.repoPath, scene.repoActorBrainDir),
          scene.linkPath,
        );
        expect(() => assertRepoBrainDirSymlinkLandsHere(scene)).not.toThrow();
      });
    });

    when('[t1] the link is absolute', () => {
      then('it passes', () => {
        const scene = genRepoScene({ slug: 'lands-here-absolute' });
        symlinkSync(scene.repoActorBrainDir, scene.linkPath);
        expect(() => assertRepoBrainDirSymlinkLandsHere(scene)).not.toThrow();
      });
    });

    when('[t2] the link lands through a hop that is itself a link', () => {
      then('it passes', () => {
        const scene = genRepoScene({ slug: 'lands-here-hop' });
        const hopPath = join(scene.repoPath, 'hop');
        symlinkSync(scene.repoActorBrainDir, hopPath);
        symlinkSync('hop', scene.linkPath);
        expect(() => assertRepoBrainDirSymlinkLandsHere(scene)).not.toThrow();
      });
    });
  });

  given('[case4] <repo>/.claude aims at another place (vision case 4)', () => {
    when('[t0] the link is checked', () => {
      then('it refuses, with both realpaths named', async () => {
        const scene = genRepoScene({ slug: 'lands-here-elsewhere' });
        mkdirSync(join(scene.repoPath, 'other'));
        symlinkSync('other', scene.linkPath);
        const error = await getError(async () =>
          assertRepoBrainDirSymlinkLandsHere(scene),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('a symlink to another place');
        expect(error.message).toContain(
          realpathSync(join(scene.repoPath, 'other')),
        );
        expect(error.message).toContain(realpathSync(scene.repoActorBrainDir));
      });
    });
  });

  given('[case5] <repo>/.claude dangles', () => {
    when('[t0] the link is checked', () => {
      then('it refuses, and names the dangle', async () => {
        const scene = genRepoScene({ slug: 'lands-here-dangle' });
        symlinkSync('absent-target', scene.linkPath);
        const error = await getError(async () =>
          assertRepoBrainDirSymlinkLandsHere(scene),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('dangles');
      });
    });
  });

  given('[case6] <repo>/.claude is a file', () => {
    when('[t0] the link is checked', () => {
      then('it refuses', async () => {
        const scene = genRepoScene({ slug: 'lands-here-file' });
        writeFileSync(scene.linkPath, 'not a dir\n');
        const error = await getError(async () =>
          assertRepoBrainDirSymlinkLandsHere(scene),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('a file, not a dir');
      });
    });
  });
});
