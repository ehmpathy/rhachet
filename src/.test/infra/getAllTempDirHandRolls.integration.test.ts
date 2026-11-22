import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { given, then, when } from 'test-fns';

import {
  asTempDirHandRollsReport,
  getAllTempDirHandRolls,
} from './getAllTempDirHandRolls';
import { TEST_REPO_ROOT } from './genTempDirPhysical';

/**
 * .what = every file git knows of in this repo, tracked or new and unignored
 * .note = a gitignored file is out of reach by design: it is never committed, so no
 *         run but its author's can ever execute it
 */
const getAllRepoFilePaths = (): string[] =>
  execSync('git ls-files --cached --others --exclude-standard', {
    cwd: TEST_REPO_ROOT,
    encoding: 'utf-8',
  })
    .split('\n')
    .filter((path) => path.length > 0)
    // a path the index still holds but the worktree removed (a staged rename) has no code to scan
    .filter((path) => existsSync(join(TEST_REPO_ROOT, path)));

/**
 * .what = whether a path is test code the rule binds
 * .note = the detector and its own tests are excluded: they name the forbidden forms as fixtures
 */
const isTestCodePath = (input: { path: string }): boolean => {
  const isScript = /\.(ts|js|cjs|mjs)$/.test(input.path);
  const isTestCode =
    input.path.startsWith('blackbox/') ||
    input.path.startsWith('src/.test/') ||
    /\.test\.(ts|js|cjs|mjs)$/.test(input.path);
  const isDetector = input.path.includes('/getAllTempDirHandRolls.');
  return isScript && isTestCode && !isDetector;
};

describe('getAllTempDirHandRolls', () => {
  given('[case1] the test code of this repo', () => {
    when('[t0] it is scanned for hand-rolled temp dirs', () => {
      const found = getAllTempDirHandRolls({
        files: getAllRepoFilePaths()
          .filter((path) => isTestCodePath({ path }))
          .map((path) => ({
            path,
            content: readFileSync(join(TEST_REPO_ROOT, path), 'utf-8'),
          })),
      });

      then('naught is found — every test temp dir routes through genTempDir', () => {
        // the failure is the message a contributor meets, so it carries the fix too
        expect(asTempDirHandRollsReport({ found })).toEqual('');
      });
    });
  });
});
