import { given, then, when } from 'test-fns';

import { type SpawnSyncReturns, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = tests rhx symlink resolution when invoked via node_modules/.bin/ symlink
 * .why = npm creates symlinks in node_modules/.bin/ that point to package bin dirs
 *        rhx must resolve the symlink before determining SCRIPT_DIR to find `run`
 *
 * .context
 *   npm creates: node_modules/.bin/rhx -> ../rhachet/bin/rhx
 *   when invoked via symlink, $0 is the symlink path, not the target
 *   without readlink -f, SCRIPT_DIR becomes node_modules/.bin/ (wrong)
 *   with readlink -f, SCRIPT_DIR becomes node_modules/rhachet/bin/ (correct)
 */
describe('rhx symlink resolution (integration)', () => {
  // path to actual rhx binary in this repo
  const rhxBinaryPath = resolve(__dirname, '../../..', 'bin/rhx');

  given('[case1] rhx invoked via symlink (npm-style)', () => {
    const testDir = resolve(__dirname, './.temp/rhx-symlink');

    beforeAll(() => {
      // clean up
      rmSync(testDir, { recursive: true, force: true });

      // create npm-style directory structure
      // testDir/
      //   node_modules/
      //     .bin/
      //       rhx -> ../rhachet/bin/rhx  (symlink)
      //     rhachet/
      //       bin/ -> actual bin/ (symlink to real bin)
      mkdirSync(resolve(testDir, 'node_modules/.bin'), { recursive: true });
      mkdirSync(resolve(testDir, 'node_modules/rhachet'), { recursive: true });

      // symlink the actual bin directory into fake node_modules/rhachet/
      symlinkSync(
        resolve(__dirname, '../../..', 'bin'),
        resolve(testDir, 'node_modules/rhachet/bin'),
        'dir',
      );

      // create npm-style relative symlink from .bin/rhx to ../rhachet/bin/rhx
      symlinkSync(
        '../rhachet/bin/rhx',
        resolve(testDir, 'node_modules/.bin/rhx'),
      );
    });

    afterAll(() => {
      rmSync(testDir, { recursive: true, force: true });
    });

    when('[t0] invoked via the symlink path', () => {
      then('it finds run binary (no "not found" error)', () => {
        // invoke via the symlink (simulating: ./node_modules/.bin/rhx)
        const symlinkPath = resolve(testDir, 'node_modules/.bin/rhx');

        const result: SpawnSyncReturns<string> = spawnSync(symlinkPath, [], {
          cwd: testDir,
          encoding: 'utf-8',
          // use shell to ensure $0 reflects the invoked path
          shell: true,
        });

        // the key assertion: should not have "not found" error for run
        // this was the original bug - `run: not found` when invoked via symlink
        expect(result.stderr).not.toContain('run: not found');
        expect(result.stderr).not.toContain('not found');
      });

      then('it can invoke --help without error', () => {
        const symlinkPath = resolve(testDir, 'node_modules/.bin/rhx');

        // test with a simple skill name that won't exist but proves routing works
        const result: SpawnSyncReturns<string> = spawnSync(
          symlinkPath,
          ['say-hello'],
          {
            cwd: testDir,
            encoding: 'utf-8',
            shell: true,
          },
        );

        // should not have "run: not found" — that's the symlink resolution bug
        expect(result.stderr).not.toContain('run: not found');

        // may fail because skill doesn't exist, but routing should work
        // the key assertion is that `run` was found
      });
    });
  });

  given('[case2] rhx invoked directly (not via symlink)', () => {
    when('[t0] invoked via absolute path', () => {
      then('it works as expected', () => {
        const result: SpawnSyncReturns<string> = spawnSync(
          rhxBinaryPath,
          ['say-hello'],
          {
            cwd: resolve(__dirname, '../../..'),
            encoding: 'utf-8',
            shell: true,
          },
        );

        // should not have "run: not found"
        expect(result.stderr).not.toContain('run: not found');
      });
    });
  });
});
