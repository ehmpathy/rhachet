import { MalfunctionError } from 'helpful-errors';

import { execFileSync } from 'node:child_process';
import { asGitEnvInCLocale } from './asGitEnvInCLocale';

/**
 * .what = remove paths from git's index, relative to a dir, and leave the files on disk;
 *         returns the paths it removed, repo-relative
 * .why = a `.gitignore` line keeps a file out of git only while it is untracked; a file already
 *        in the index stays tracked until it is removed from it. one owner of that untrack,
 *        and of the one fault it may ignore
 *
 * .note = a read-only `git ls-files` probe runs first and takes no lock; `git rm` runs only when
 *   it lists a path. so the steady state (naught tracked) never writes the index, never waits
 *   on another git process's index lock, and never fails because one is held
 * .note = a dir outside any git repo has no index, so naught is owed there; every other fault
 *   leaves the path tracked, so it fails loud
 * .note = git runs with `-C dir`, so the pathspecs never depend on process.cwd(), and in the C
 *   locale, so the outside-a-repo message reads the same under any `LANG`
 * .note = git refuses to drop staged content that differs from both the file and HEAD;
 *   `force` drops it anyway. only the index entry is lost, never the file on disk
 */
export const delGitIndexPaths = (input: {
  dir: string;
  pathspecs: string[];
  recursive: boolean;
  force: boolean;
  faultMessage: string;
}): { removed: string[] } => {
  // list what the index holds under the pathspecs; a read takes no lock
  const tracked = runGit({
    dir: input.dir,
    args: ['ls-files', '--full-name', '--', ...input.pathspecs],
    faultMessage: input.faultMessage,
    pathspecs: input.pathspecs,
  });
  if (tracked === null) return { removed: [] };
  const removed = tracked.split('\n').filter((line) => line !== '');
  if (removed.length === 0) return { removed: [] };

  // drop each listed path from the index; the files stay on disk
  runGit({
    dir: input.dir,
    args: [
      'rm',
      '--cached',
      ...(input.recursive ? ['-r'] : []),
      ...(input.force ? ['--force'] : []),
      '--quiet',
      '--ignore-unmatch',
      '--',
      ...input.pathspecs,
    ],
    faultMessage: input.faultMessage,
    pathspecs: input.pathspecs,
  });
  return { removed };
};

/**
 * .what = run one git command in a dir, in the C locale; returns its stdout, or null when the
 *         dir sits outside any git repo
 * .why = both the probe and the removal share the one fault they may forgive
 */
const runGit = (input: {
  dir: string;
  args: string[];
  faultMessage: string;
  pathspecs: string[];
}): string | null => {
  try {
    return execFileSync('git', ['-C', input.dir, ...input.args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: asGitEnvInCLocale({ env: process.env }),
    }).toString();
  } catch (error) {
    // .note = the message carries git's stderr; the stderr field alone can arrive empty
    const cause = error instanceof Error ? error : new Error(String(error));
    const stderr = 'stderr' in cause ? String(cause.stderr ?? '') : '';
    const isOutsideRepo = `${cause.message}\n${stderr}`
      .toLowerCase()
      .includes('not a git repository');
    if (isOutsideRepo) return null;
    throw new MalfunctionError(input.faultMessage, {
      dir: input.dir,
      pathspecs: input.pathspecs,
      cause,
    });
  }
};
