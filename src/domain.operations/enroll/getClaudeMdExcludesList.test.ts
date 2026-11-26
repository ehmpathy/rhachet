import picomatch from 'picomatch';
import { given, then, when } from 'test-fns';

import {
  CLAUDE_MD_EXCLUDE_HOME_GLOB,
  getClaudeMdExcludesList,
} from './getClaudeMdExcludesList';

/**
 * .note = the door names are pinned as LITERALS here on purpose, though the source reads
 *   them from `BRAIN_DIR_BOOT_FILENAMES`. that asymmetry is the clamp: a rename at the
 *   constant turns this suite red, so the wire names cannot move in silence. to read the
 *   constant here too would make the assertion tautological and the tripwire inert
 */
describe('getClaudeMdExcludesList', () => {
  const repoActorBrainDir =
    '/repo/.agent/.actors/actor.via.repo=ambient/brain/.claude';

  given('[case1] a repo and a repo actor brain dir', () => {
    when('[t0] the excludes list is built', () => {
      then(
        'both repo doors in both spellings, every home CLAUDE.md by glob, every CLAUDE.local.md by glob, and both rules globs, in order',
        () => {
          expect(
            getClaudeMdExcludesList({ repoPath: '/repo', repoActorBrainDir }),
          ).toEqual([
            '/repo/.claude/AGENTS.md',
            '/repo/.claude/CLAUDE.md',
            `${repoActorBrainDir}/AGENTS.md`,
            `${repoActorBrainDir}/CLAUDE.md`,
            '**/!(brain)/.claude/CLAUDE.md',
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
          getClaudeMdExcludesList({ repoPath: '/repo', repoActorBrainDir });
        expect(build()).toEqual(build());
      });
    });
  });

  given('[case2] a repoPath with a trail slash', () => {
    when('[t0] the excludes list is built', () => {
      then('no entry holds a double slash', () => {
        const list = getClaudeMdExcludesList({
          repoPath: '/repo/',
          repoActorBrainDir,
        });
        expect(list.filter((entry) => entry.includes('//'))).toEqual([]);
      });
    });
  });
});

/**
 * .what = the home glob, matched the way claude code matches it
 * .why = claude-code (2.1.308) builds `picomatch(patterns, { dot: true })` and tests the
 *        absolute path with `\` turned to `/`. a pattern that matches naught here is a silent
 *        no-op in claude; a pattern that matches an actor door hides that clone's boot
 * .note = the real-cli proof is the acceptance probe; this is the fast clamp over every shape
 */
describe('CLAUDE_MD_EXCLUDE_HOME_GLOB', () => {
  const isExcluded = (path: string): boolean =>
    picomatch([CLAUDE_MD_EXCLUDE_HOME_GLOB], { dot: true })(
      path.split('\\').join('/'),
    );

  const EXCLUDED = [
    { description: 'a linux home', path: '/home/x/.claude/CLAUDE.md' },
    { description: 'a macos home', path: '/Users/x/.claude/CLAUDE.md' },
    { description: 'the root home', path: '/root/.claude/CLAUDE.md' },
    { description: 'a deep home', path: '/var/lib/x/.claude/CLAUDE.md' },
    {
      description: 'a temp home under a test dir',
      path: '/tmp/a/b/home/.claude/CLAUDE.md',
    },
    {
      description: 'a windows home',
      path: 'C:\\Users\\x\\.claude\\CLAUDE.md',
    },
    {
      description: 'an ancestor dir of the repo',
      path: '/home/x/git/.claude/CLAUDE.md',
    },
    {
      description: 'the repo link path (project memory)',
      path: '/home/x/git/repo/.claude/CLAUDE.md',
    },
    {
      description: 'a home at the filesystem root (HOME=/)',
      path: '/.claude/CLAUDE.md',
    },
    {
      description: 'a near-miss: a parent named xbrain',
      path: '/r/.agent/.actors/actor.via.hash=a/xbrain/.claude/CLAUDE.md',
    },
  ];

  const KEPT = [
    {
      description: "the repo actor's own door",
      path: '/home/x/git/repo/.agent/.actors/actor.via.repo=ambient/brain/.claude/CLAUDE.md',
    },
    {
      description: "a hash actor's own door",
      path: '/home/x/git/repo/.agent/.actors/actor.via.hash=abc/brain/.claude/CLAUDE.md',
    },
    {
      description: 'a home named brain — the known gap, pinned (fulcrum F1)',
      path: '/home/brain/.claude/CLAUDE.md',
    },
    {
      // .note = picomatch's negated extglob is prefix-scoped: `!(brain)` rejects any segment
      //   that starts with `brain`, so the gap spans every home whose name starts so
      description: 'a home whose name starts with brain — the same gap, pinned',
      path: '/home/brainy/.claude/CLAUDE.md',
    },
    {
      description:
        'a near-miss: a parent named brains — the same prefix gap, pinned',
      path: '/r/.agent/.actors/actor.via.hash=a/brains/.claude/CLAUDE.md',
    },
  ];

  EXCLUDED.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the glob is matched against the path', () => {
        then(`${thisCase.path} is excluded`, () => {
          expect(isExcluded(thisCase.path)).toEqual(true);
        });
      });
    }),
  );

  KEPT.map((thisCase, index) =>
    given(
      `[case${EXCLUDED.length + index + 1}] ${thisCase.description}`,
      () => {
        when('[t0] the glob is matched against the path', () => {
          then(`${thisCase.path} is kept`, () => {
            expect(isExcluded(thisCase.path)).toEqual(false);
          });
        });
      },
    ),
  );
});
