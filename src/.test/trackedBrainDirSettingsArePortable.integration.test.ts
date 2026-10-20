import { given, then, useBeforeAll, when } from 'test-fns';

import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

/**
 * .what = this repo's own tracked brain dir settings name no box: every tracked arrow is
 *         relative, and no tracked settings file holds a home path with a real user in it
 * .why = S2 and S6 promise the tracked actor dir reads the same on every box. the real-claude
 *   suite proves it for a temp repo; this holds it for the files this repo ships, so a stale
 *   `rhx init` output with `/home/<user>/...` goes red before it is committed
 *
 * .note = a portable glob (`**\/home/*\/.claude/CLAUDE.md`) is allowed: its user segment is `*`
 * .note = reads each tracked path as it sits on disk; run `rhx init` to repair a red case
 */
describe('this repo — tracked brain dir settings are portable', () => {
  const REPO_ROOT = join(__dirname, '..', '..');

  /**
   * .what = a home path whose user segment is a real name, never a glob
   * .note = a user segment never opens with a dot, so `/github/home/.claude/` (a home that is
   *   itself named `home`) holds no user
   */
  const HOME_PATH_WITH_USER = /\/(home|Users)\/[^*/"\s.][^*/"\s]*\//;

  given('[case0] the home-path detector itself', () => {
    when('[t0] it reads a machine path and a portable glob', () => {
      then('a real user segment is caught; a glob segment is not', () => {
        // the clamp's teeth, proven on fixed inputs rather than on a tracked file
        expect(
          [
            '"/home/camper/.claude/CLAUDE.md"',
            '"/Users/ann/.claude/settings.json"',
            '"**/home/*/.claude/CLAUDE.md"',
            '"**/Users/*/.claude/CLAUDE.md"',
            '"/root/.claude/CLAUDE.md"',
            '"/github/home/.claude/CLAUDE.md"',
          ].map((line) => HOME_PATH_WITH_USER.test(line)),
        ).toEqual([true, true, false, false, false, false]);
      });
    });
  });

  given('[case1] the tracked settings names under .agent/.actors', () => {
    const scene = useBeforeAll(async () => {
      const listed = spawnSync(
        'git',
        ['ls-files', '--', '.agent/.actors/**/settings*.json'],
        { cwd: REPO_ROOT },
      );
      const paths = listed.stdout
        .toString()
        .split('\n')
        .filter((path) => path.length > 0);
      return { status: listed.status, paths };
    });

    when('[t0] each is read from disk', () => {
      then('git lists at least the repo actor settings', () => {
        expect(scene.status).toEqual(0);
        expect(scene.paths).toContain(
          '.agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.repo.json',
        );
      });

      then('every tracked arrow has a relative target', () => {
        const arrowsAbsolute = scene.paths
          .filter((path) => lstatSync(join(REPO_ROOT, path)).isSymbolicLink())
          .map((path) => ({ path, target: readlinkSync(join(REPO_ROOT, path)) }))
          .filter(({ target }) => isAbsolute(target));
        expect(arrowsAbsolute).toEqual([]);
      });

      then('no tracked settings file holds a home path with a real user', () => {
        const filesWithHome = scene.paths
          .filter((path) => lstatSync(join(REPO_ROOT, path)).isFile())
          .filter((path) =>
            HOME_PATH_WITH_USER.test(readFileSync(join(REPO_ROOT, path), 'utf8')),
          );
        expect(filesWithHome).toEqual([]);
      });
    });
  });
});
