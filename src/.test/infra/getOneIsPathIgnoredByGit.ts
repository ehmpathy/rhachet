import { MalfunctionError } from 'helpful-errors';

import { spawnSync } from 'node:child_process';

/**
 * .what = whether git ignores a path in a repo, via the index-free check
 * .why = `git check-ignore` answers by exit code: 0 = ignored, 1 = not ignored. any other
 *        outcome (git absent, a bad cwd, a fatal) is a fault of the probe, never an answer —
 *        so it fails loud rather than read as "not ignored" and pass a test that proved naught
 */
export const getOneIsPathIgnoredByGit = (input: {
  repo: string;
  path: string;
}): boolean => {
  const result = spawnSync(
    'git',
    ['check-ignore', '--no-index', '-q', input.path],
    { cwd: input.repo, encoding: 'utf8' },
  );
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw new MalfunctionError('git check-ignore gave no answer', {
    repo: input.repo,
    path: input.path,
    status: result.status,
    stderr: result.stderr,
    cause: result.error,
    hint: 'check that git is on PATH and that the repo dir exists',
  });
};
