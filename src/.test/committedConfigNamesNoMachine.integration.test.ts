import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';
import { MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { join, relative } from 'node:path';
import { getAllMachineNamesInText } from './infra/getAllMachineNamesInText';
import { getThisMachine } from './infra/getThisMachine';

const REPO_ROOT = join(__dirname, '..', '..');
const REPO_ACTOR_BRAIN_DIR_REL = relative(
  REPO_ROOT,
  getBrainOndiskDir({
    actorDir: getOneRepoActorOndiskDir({ repoPath: REPO_ROOT }),
  }),
);

const MACHINE = getThisMachine();

/**
 * .what = the hint a red scan prints beside what it found
 * .why = the commonest cause is a global `rhx` older than the fix, which re-renders the home
 *        literal on each launch; the reader needs the cure, not only the span
 */
const HINT =
  'a file: re-render with the branch build — `npm run build && npx rhx init --hooks` — and upgrade the global rhx. a link: `git rm --cached <path>`; the brain dir allowlist keeps it out';

/**
 * .what = every path git tracks in the repo actor brain dir, repo-relative
 * .why = the scan must reach each committed file and link, not a list kept by hand
 */
const getAllTrackedPathsInBrainDir = (): string[] => {
  const result = spawnSync(
    'git',
    ['ls-files', '--', REPO_ACTOR_BRAIN_DIR_REL],
    { cwd: REPO_ROOT },
  );
  if (result.status !== 0)
    throw new MalfunctionError('git ls-files failed', {
      status: result.status,
      stderr: result.stderr?.toString() ?? null,
    });
  return result.stdout
    .toString()
    .split('\n')
    .filter((path) => path !== '');
};

/**
 * .what = every span of a text that names this machine or this checkout
 * .why = a checkout path (`/workspace/repo`) is not home-shaped, so the shape scan cannot see it
 */
const getAllNamesInText = (input: { text: string }): string[] => [
  ...getAllMachineNamesInText({ text: input.text, machine: MACHINE }),
  ...(input.text.includes(REPO_ROOT) ? [REPO_ROOT] : []),
];

/**
 * .what = this repo's own committed repo actor brain dir names no machine — in a file's
 *         content or in a link's target
 * .why = rule.forbid.machine-names-in-committed-config, held where it bites: a hand edit, a
 *        stale render, or a tracked home link turns ci red before it can merge
 */
describe('committed config names no machine', () => {
  given('[case1] each tracked file in the repo actor brain dir', () => {
    when('[t0] each file content is scanned', () => {
      then('no file names a home, user, host, or checkout', () => {
        const files = getAllTrackedPathsInBrainDir().filter(
          (path) => !lstatSync(join(REPO_ROOT, path)).isSymbolicLink(),
        );
        const filesWithMachineName = files
          .map((path) => ({
            path,
            found: getAllNamesInText({
              text: readFileSync(join(REPO_ROOT, path), 'utf-8'),
            }),
          }))
          .filter((file) => file.found.length > 0);
        expect(files).toContain(
          `${REPO_ACTOR_BRAIN_DIR_REL}/settings.of.repo.json`,
        );
        expect({ filesWithMachineName, hint: HINT }).toEqual({
          filesWithMachineName: [],
          hint: HINT,
        });
      });
    });
  });

  given('[case2] each tracked symlink in the repo actor brain dir', () => {
    when('[t0] each link target is scanned', () => {
      then('no target names a home, user, host, or checkout', () => {
        const links = getAllTrackedPathsInBrainDir().filter((path) =>
          lstatSync(join(REPO_ROOT, path)).isSymbolicLink(),
        );
        const linksWithMachineName = links
          .map((path) => ({
            path,
            found: getAllNamesInText({
              text: readlinkSync(join(REPO_ROOT, path)),
            }),
          }))
          .filter((link) => link.found.length > 0);
        expect(links.length).toBeGreaterThan(0);
        expect({ linksWithMachineName, hint: HINT }).toEqual({
          linksWithMachineName: [],
          hint: HINT,
        });
      });
    });
  });
});
