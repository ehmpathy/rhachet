import picomatch from 'picomatch';
import { given, then, when } from 'test-fns';

import { getClaudeMdExcludesList } from './getClaudeMdExcludesList';

/**
 * .note = the door names are pinned as LITERALS here on purpose, though the source reads
 *   them from `BRAIN_DIR_BOOT_FILENAMES`. that asymmetry is the clamp: a rename at the
 *   constant turns this suite red, so the wire names cannot move in silence. to read the
 *   constant here too would make the assertion tautological and the tripwire inert
 */
describe('getClaudeMdExcludesList', () => {
  given('[case1] a clone of any actor', () => {
    when('[t0] the excludes list is built', () => {
      then(
        'every brain dir door in both spellings, every CLAUDE.local.md, and every rules dir, as globs, in order',
        () => {
          expect(getClaudeMdExcludesList()).toEqual([
            '**/.claude/AGENTS.md',
            '**/.claude/CLAUDE.md',
            '**/CLAUDE.local.md',
            '**/.claude/rules/**',
          ]);
        },
      );

      then(
        'no entry names a host path, so the tracked settings file never drifts per worktree',
        () => {
          expect(
            getClaudeMdExcludesList().filter((entry) => entry.startsWith('/')),
          ).toEqual([]);
        },
      );

      then(
        'no entry, matched as a glob, hides a boot revision drift — while each brain dir door is hidden',
        () => {
          const isExcluded = picomatch(getClaudeMdExcludesList(), {
            dot: true,
          });
          const repo = '/home/human/git/surf-school';

          // the drift a clone must read, by its absolute path and by its repo-relative one
          expect(
            isExcluded(
              `${repo}/.agent/.actors/actor.via.hash=abc/boots/sha256=0123456789abcdef/CLAUDE.md`,
            ),
          ).toBe(false);
          expect(
            isExcluded(
              '.agent/.actors/actor.via.hash=abc/boots/sha256=0123456789abcdef/CLAUDE.md',
            ),
          ).toBe(false);

          // the positive control: the doors the excludes exist to shut are shut
          expect(
            isExcluded(
              `${repo}/.agent/.actors/actor.via.hash=abc/brain/.claude/CLAUDE.md`,
            ),
          ).toBe(true);
          expect(isExcluded(`${repo}/.claude/AGENTS.md`)).toBe(true);
          expect(isExcluded(`${repo}/CLAUDE.local.md`)).toBe(true);
        },
      );
    });
  });
});
