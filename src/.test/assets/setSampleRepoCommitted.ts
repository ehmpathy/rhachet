import { execFileSync } from 'node:child_process';

/**
 * .what = stage and commit every path in a test repo
 * .why = a boot file is dropped ONLY where git could hand it back, so a case that asserts a
 *   DROP must first put that file where git can reach it. the identity rides on `-c`, so the
 *   test needs no global git config to exist
 */
export const setSampleRepoCommitted = (input: { repoPath: string }): void => {
  execFileSync('git', ['add', '-A'], { cwd: input.repoPath, stdio: 'pipe' });
  execFileSync(
    'git',
    [
      '-c',
      'user.email=test@example.com',
      '-c',
      'user.name=test',
      'commit',
      '-q',
      '-m',
      'seed',
    ],
    { cwd: input.repoPath, stdio: 'pipe' },
  );
};
