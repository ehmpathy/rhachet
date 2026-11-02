import picomatch from 'picomatch';
import { given, then, when } from 'test-fns';

import {
  CLAUDE_MD_EXCLUDES_HOME,
  getAllClaudeMdExcludes,
} from './getAllClaudeMdExcludes';

/**
 * .note = the door names are pinned as LITERALS here on purpose, though the source reads
 *   them from `BRAIN_DIR_BOOT_FILENAMES`. that asymmetry is the clamp: a rename at the
 *   constant turns this suite red, so the wire names cannot move in silence. to read the
 *   constant here too would make the assertion tautological and the tripwire inert
 */
describe('getAllClaudeMdExcludes', () => {
  const repoActorBrainDir =
    '/repo/.agent/.actors/actor.via.repo=ambient/brain/.claude';

  given('[case1] a repo and a repo actor brain dir', () => {
    when('[t0] the excludes list is built', () => {
      then(
        'both repo doors in both spellings, the home CLAUDE.md as portable globs, every CLAUDE.local.md by glob, and both rules globs, in order',
        () => {
          expect(
            getAllClaudeMdExcludes({ repoPath: '/repo', repoActorBrainDir }),
          ).toEqual([
            '/repo/.claude/AGENTS.md',
            '/repo/.claude/CLAUDE.md',
            `${repoActorBrainDir}/AGENTS.md`,
            `${repoActorBrainDir}/CLAUDE.md`,
            '**/home/*/.claude/CLAUDE.md',
            '**/Users/*/.claude/CLAUDE.md',
            '/root/.claude/CLAUDE.md',
            '/github/home/.claude/CLAUDE.md',
            '**/CLAUDE.local.md',
            '/repo/.claude/rules/**',
            `${repoActorBrainDir}/rules/**`,
          ]);
        },
      );
    });

    when('[t1] the list is built twice', () => {
      then('the two arrays are equal', () => {
        const build = () =>
          getAllClaudeMdExcludes({ repoPath: '/repo', repoActorBrainDir });
        expect(build()).toEqual(build());
      });
    });
  });

  given('[case2] a repoPath with a trail slash', () => {
    when('[t0] the excludes list is built', () => {
      then('no entry holds a double slash', () => {
        const list = getAllClaudeMdExcludes({
          repoPath: '/repo/',
          repoActorBrainDir,
        });
        expect(list.filter((entry) => entry.includes('//'))).toEqual([]);
      });
    });
  });

  given(
    '[case3] the home globs, matched as claude matches them (picomatch)',
    () => {
      const isHome = picomatch(CLAUDE_MD_EXCLUDES_HOME, { dot: true });

      when('[t0] a home door on each covered root', () => {
        then('each one matches', () => {
          expect(
            [
              '/home/alice/.claude/CLAUDE.md',
              '/Users/alice/.claude/CLAUDE.md',
              '/root/.claude/CLAUDE.md',
              '/github/home/.claude/CLAUDE.md',
            ].map((path) => isHome(path)),
          ).toEqual([true, true, true, true]);
        });
      });

      when('[t1] a repo door or a clone door', () => {
        then('none matches — a `*` never crosses a `/`', () => {
          expect(
            [
              '/home/alice/git/repo/.claude/CLAUDE.md',
              '/home/alice/git/repo/.agent/.actors/actor.via.repo=ambient/brain/.claude/CLAUDE.md',
              '/Users/alice/repo/.claude/CLAUDE.md',
            ].map((path) => isHome(path)),
          ).toEqual([false, false, false]);
        });
      });

      when('[t2] a home outside the four covered roots', () => {
        then(
          'one below any `home/` hits; a custom `/srv/<user>` misses (the known gap, F11)',
          () => {
            expect(
              [
                '/var/home/alice/.claude/CLAUDE.md',
                '/srv/alice/.claude/CLAUDE.md',
              ].map((path) => isHome(path)),
            ).toEqual([true, false]);
          },
        );
      });

      when(
        '[t3] a repo dir that itself holds `home/<name>/.claude/CLAUDE.md`',
        () => {
          then(
            'it matches too — the over-match a dotfiles repo meets (F11)',
            () => {
              expect(
                isHome('/work/dotfiles/home/alice/.claude/CLAUDE.md'),
              ).toBe(true);
            },
          );
        },
      );
    },
  );
});
