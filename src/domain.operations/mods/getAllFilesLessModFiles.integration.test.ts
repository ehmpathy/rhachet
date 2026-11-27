import { genTempDir, given, then, when } from 'test-fns';

import { mkdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllFilesLessModFiles } from './getAllFilesLessModFiles';

/**
 * .what = a temp repo with one published brief and one mod brief, plus a view that links each
 */
const genRepoWithViewOfModAndPublished = (input: {
  slug: string;
  modsDirAsLink: boolean;
}): { cwd: string; view: { published: string; modded: string } } => {
  const cwd = realpathSync(genTempDir({ slug: input.slug }));

  // the published brief, where a package would keep it
  const dirPublished = join(cwd, 'node_modules', 'pkg', 'briefs');
  mkdirSync(dirPublished, { recursive: true });
  writeFileSync(join(dirPublished, 'rule.require.wax.md'), 'published\n');

  // the mods dir, real or a link to a real dir elsewhere in the repo
  const dirModsReal = input.modsDirAsLink
    ? join(cwd, 'mods.real')
    : join(cwd, '.agent', 'repo=.mods');
  mkdirSync(join(dirModsReal, 'role=surfer', 'briefs'), { recursive: true });
  writeFileSync(
    join(dirModsReal, 'role=surfer', 'briefs', 'rule.require.reef.md'),
    'modded\n',
  );
  if (input.modsDirAsLink) {
    mkdirSync(join(cwd, '.agent'), { recursive: true });
    symlinkSync(dirModsReal, join(cwd, '.agent', 'repo=.mods'));
  }

  // the view: one link to each, as a render leaves them
  const dirView = join(cwd, '.agent', 'repo=test', 'role=surfer', 'briefs');
  mkdirSync(dirView, { recursive: true });
  const published = join(dirView, 'rule.require.wax.md');
  const modded = join(dirView, 'rule.require.reef.md');
  symlinkSync(join(dirPublished, 'rule.require.wax.md'), published);
  symlinkSync(
    join(
      cwd,
      '.agent',
      'repo=.mods',
      'role=surfer',
      'briefs',
      'rule.require.reef.md',
    ),
    modded,
  );
  return { cwd, view: { published, modded } };
};

describe('getAllFilesLessModFiles', () => {
  given('[case1] a view that links one published file and one mod file', () => {
    const { cwd, view } = genRepoWithViewOfModAndPublished({
      slug: 'files-less-mod-real',
      modsDirAsLink: false,
    });

    when('[t0] the files are filtered', () => {
      const files = getAllFilesLessModFiles({
        files: [view.published, view.modded],
        cwd,
      });

      then('the published link is kept', () => {
        expect(files).toContain(view.published);
      });

      then(
        'the link into the mods dir is dropped, by where it truly lives (F03)',
        () => {
          expect(files).not.toContain(view.modded);
        },
      );
    });

    when('[t1] a file of the mods dir itself is filtered', () => {
      then('it is dropped', () => {
        const fileMod = join(
          cwd,
          '.agent',
          'repo=.mods',
          'role=surfer',
          'briefs',
          'rule.require.reef.md',
        );
        expect(getAllFilesLessModFiles({ files: [fileMod], cwd })).toEqual([]);
      });
    });

    when('[t2] a path that does not exist is filtered', () => {
      then(
        'it is dropped, never thrown: no real path proves it lives outside the mods',
        () => {
          const absent = join(cwd, 'absent.md');
          expect(getAllFilesLessModFiles({ files: [absent], cwd })).toEqual([]);
        },
      );
    });

    when(
      '[t3] a broken view link that points into the mods dir is filtered',
      () => {
        then(
          'it is dropped, so no mod file leaks into a published boot (F03)',
          () => {
            const dirView = join(
              cwd,
              '.agent',
              'repo=test',
              'role=surfer',
              'briefs',
            );
            const linkBroken = join(dirView, 'rule.require.gone.md');
            symlinkSync(
              join(
                cwd,
                '.agent',
                'repo=.mods',
                'role=surfer',
                'briefs',
                'rule.require.gone.md',
              ),
              linkBroken,
            );
            expect(
              getAllFilesLessModFiles({
                files: [view.published, linkBroken],
                cwd,
              }),
            ).toEqual([view.published]);
          },
        );
      },
    );
  });

  given('[case2] a mods dir that is itself a symlink', () => {
    const { cwd, view } = genRepoWithViewOfModAndPublished({
      slug: 'files-less-mod-linked',
      modsDirAsLink: true,
    });

    when('[t0] the files are filtered', () => {
      const files = getAllFilesLessModFiles({
        files: [view.published, view.modded],
        cwd,
      });

      then('the link into the mods dir is still dropped', () => {
        expect(files).toEqual([view.published]);
      });
    });
  });

  given('[case3] a repo with no mods dir', () => {
    const cwd = realpathSync(genTempDir({ slug: 'files-less-mod-none' }));
    const file = join(cwd, 'readme.md');
    writeFileSync(file, 'hi\n');

    when('[t0] the files are filtered', () => {
      then('every file is kept', () => {
        expect(getAllFilesLessModFiles({ files: [file], cwd })).toEqual([file]);
      });
    });
  });
});
