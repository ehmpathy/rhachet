import { given, then, when } from 'test-fns';

import { getClaudeMdExcludesList } from './getClaudeMdExcludesList';

/**
 * .note = the door names are pinned as LITERALS here on purpose, though the source reads
 *   them from `BRAIN_DIR_BOOT_FILENAMES`. that asymmetry is the clamp: a rename at the
 *   constant turns this suite red, so the wire names cannot move in silence. to read the
 *   constant here too would make the assertion tautological and the tripwire inert
 */
describe('getClaudeMdExcludesList', () => {
  const defaultBrainDir =
    '/repo/.agent/.actors/actor.via.slug=.default/brain/.claude';

  given('[case1] a repo, a default brain dir, and a home', () => {
    when('[t0] the excludes list is built', () => {
      then(
        'both repo doors in both spellings, the user CLAUDE.md, the repo CLAUDE.local.md, and both rules globs, in order',
        () => {
          expect(
            getClaudeMdExcludesList({
              repoPath: '/repo',
              defaultBrainDir,
              home: '/home/h',
            }),
          ).toEqual([
            '/repo/.claude/AGENTS.md',
            '/repo/.claude/CLAUDE.md',
            `${defaultBrainDir}/AGENTS.md`,
            `${defaultBrainDir}/CLAUDE.md`,
            '/home/h/.claude/CLAUDE.md',
            '/repo/CLAUDE.local.md',
            '/repo/.claude/rules/**',
            `${defaultBrainDir}/rules/**`,
          ]);
        },
      );
    });

    when('[t1] the list is built twice', () => {
      then('the two arrays are equal', () => {
        const build = () =>
          getClaudeMdExcludesList({
            repoPath: '/repo',
            defaultBrainDir,
            home: '/home/h',
          });
        expect(build()).toEqual(build());
      });
    });
  });

  given('[case2] a repoPath with a trail slash', () => {
    when('[t0] the excludes list is built', () => {
      then('no entry holds a double slash', () => {
        const list = getClaudeMdExcludesList({
          repoPath: '/repo/',
          defaultBrainDir,
          home: '/home/h',
        });
        expect(list.filter((entry) => entry.includes('//'))).toEqual([]);
      });
    });
  });
});
