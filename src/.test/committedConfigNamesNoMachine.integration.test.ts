import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';
import { MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { spawnSync } from 'node:child_process';
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
 * .what = run one git command at the repo root; returns its stdout
 * .why = the scan reads git's own record, so a git fault must fail loud
 */
const runGit = (input: { args: string[] }): string => {
  const result = spawnSync('git', input.args, { cwd: REPO_ROOT });
  if (result.status !== 0)
    throw new MalfunctionError('git failed', {
      args: input.args,
      status: result.status,
      stderr: result.stderr?.toString() ?? null,
    });
  return result.stdout.toString();
};

/**
 * .what = every entry git tracks in the repo actor brain dir: its path, whether it is a link,
 *         and its committed bytes (a link's bytes are its target)
 * .why = the scan grades what git holds, never the worktree: a box may lack a tracked file on
 *        disk (a groveless box drops the `settings.json` arrow), and the bytes that ship are
 *        the index's either way
 */
const getAllTrackedEntriesInBrainDir = (): {
  path: string;
  isLink: boolean;
  content: string;
}[] =>
  runGit({ args: ['ls-files', '-s', '--', REPO_ACTOR_BRAIN_DIR_REL] })
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => {
      // each line reads `<mode> <blob> <stage>\t<path>`
      const [meta, path] = line.split('\t') as [string, string];
      const [mode, blob] = meta.split(' ') as [string, string];
      return {
        path,
        isLink: mode === '120000',
        content: runGit({ args: ['cat-file', 'blob', blob] }),
      };
    });

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
        const files = getAllTrackedEntriesInBrainDir().filter(
          (entry) => !entry.isLink,
        );
        const filesWithMachineName = files
          .map((entry) => ({
            path: entry.path,
            found: getAllNamesInText({ text: entry.content }),
          }))
          .filter((file) => file.found.length > 0);
        expect(files.map((entry) => entry.path)).toContain(
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
        const links = getAllTrackedEntriesInBrainDir().filter(
          (entry) => entry.isLink,
        );
        const linksWithMachineName = links
          .map((entry) => ({
            path: entry.path,
            found: getAllNamesInText({ text: entry.content }),
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
