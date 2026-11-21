import { spawnSync } from 'child_process';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'fs';
import { isAbsolute, join } from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { isTimeoutFailure } from './isTimeoutFailure';

/**
 * .what = the leak sweep, driven through a real jest run: a tiny project whose only test spawns a
 *   child, with the real reporter on its reporters list
 * .why = the reporter's own test calls its hooks by hand. this one proves the seam that turns a
 *   leak into a red run — jest loads the reporter by its `.jest.cjs` entry, reads its error after
 *   the summary, and exits 1 — so a jest that stopped to read a reporter's error would fail here,
 *   not ship leaks green. [case3] proves the other seam the reporter leans on: the timeout text
 *   and the file path a real jest writes, which the starved note matches and re-runs
 * .note = the project is plain commonjs, so the run needs no transform; its globalSetup mints the
 *   run id and the minter mark as `jest.acceptance.globalSetup.ts` does
 */

/** the reporter entry jest loads, by absolute path */
const REPORTER_ENTRY = join(__dirname, 'ReporterAcceptanceBox.jest.cjs');

/**
 * .what = this process's env, less the vars this outer jest worker set for itself
 * .why = the inner jest must mint its own run, as a run from a shell would
 */
const ENV_AS_SHELL = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !/^(JEST_|NODE_ENV$|FORCE_COLOR$|TEST_FNS_RUN$|RHACHET_ACCEPTANCE_RUN_MINTER$)/.test(key),
  ),
);

/**
 * .what = the body of the project's one test, per kind
 * .why = `leak` spawns a child it never ends; `clean` spawns none; `timeout` outruns a 50ms
 *   test timeout, so jest itself writes the timeout failure the starved note reads
 */
const TEST_BODY_BY_KIND = {
  leak: (dir: string) =>
    [
      "test('the test runs', () => {",
      "  const child = require('child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1e9)'], { stdio: 'ignore', detached: true });",
      '  child.unref();',
      `  require('fs').writeFileSync(${JSON.stringify(join(dir, 'child.pid'))}, String(child.pid));`,
      '});',
      '',
    ].join('\n'),
  clean: () => ["test('the test runs', () => {", '  expect(1).toBe(1);', '});', ''].join('\n'),
  timeout: () =>
    [
      "test('the test runs', async () => {",
      '  await new Promise((done) => setTimeout(done, 400));',
      '}, 50);',
      '',
    ].join('\n'),
};

/**
 * .what = a reporter that writes each file's failure message and path, as jest hands them over
 * .why = the starved note reads `failureMessage` and `testFilePath` off jest's own results; this
 *   records them as a real run writes them, so the test can feed them to the reporter's matcher
 */
const REPORTER_RECORD_SOURCE = [
  'module.exports = class {',
  '  onRunComplete(_contexts, results) {',
  "    const files = results.testResults.map((file) => ({ testFilePath: file.testFilePath, failureMessage: file.failureMessage ?? '' }));",
  "    require('fs').writeFileSync(require('path').join(__dirname, 'results.json'), JSON.stringify(files));",
  '  }',
  '};',
  '',
].join('\n');

/**
 * .what = a temp jest project with one test of the given kind
 */
const genJestProject = (input: { slug: string; kind: keyof typeof TEST_BODY_BY_KIND }): string => {
  const dir = genTempDir({ slug: input.slug });
  writeFileSync(join(dir, 'record.reporter.cjs'), REPORTER_RECORD_SOURCE);
  writeFileSync(
    join(dir, 'jest.config.cjs'),
    `module.exports = ${JSON.stringify({
      rootDir: dir,
      testMatch: ['<rootDir>/leak.test.cjs'],
      testEnvironment: 'node',
      transform: {},
      globalSetup: '<rootDir>/setup.cjs',
      reporters: ['default', REPORTER_ENTRY, '<rootDir>/record.reporter.cjs'],
    })};\n`,
  );
  writeFileSync(
    join(dir, 'setup.cjs'),
    [
      'module.exports = async () => {',
      // load the reporter's ts graph before the mint, so the esbuild service it starts carries no
      //   run id (measured 2026-11-16: unloaded, the service starts after the mint, and the sweep
      //   counts it a leak; the real acceptance runs read green with the sweep live)
      `  require(${JSON.stringify(REPORTER_ENTRY)});`,
      "  const runId = 'r' + require('crypto').randomBytes(4).toString('hex');",
      '  process.env.TEST_FNS_RUN = runId;',
      "  process.env.RHACHET_ACCEPTANCE_RUN_MINTER = process.pid + ':' + runId;",
      '};',
      '',
    ].join('\n'),
  );
  writeFileSync(join(dir, 'leak.test.cjs'), TEST_BODY_BY_KIND[input.kind](dir));
  return dir;
};

/**
 * .what = the per-file results the record reporter wrote
 */
const getRecordedResults = (input: {
  dir: string;
}): Array<{ testFilePath: string; failureMessage: string }> =>
  JSON.parse(readFileSync(join(input.dir, 'results.json'), 'utf-8'));

/**
 * .what = run real jest on a project
 */
const runJest = (input: {
  dir: string;
}): { status: number | null; stderr: string; isChildAlive: boolean | null } => {
  const ran = spawnSync(
    process.execPath,
    [require.resolve('jest/bin/jest'), '-c', join(input.dir, 'jest.config.cjs'), '--forceExit'],
    { cwd: input.dir, env: ENV_AS_SHELL, encoding: 'utf-8' },
  );
  return { status: ran.status, stderr: ran.stderr, isChildAlive: getIsChildAlive({ dir: input.dir }) };
};

/**
 * .what = whether the child a leaky test spawned still lives, or null where none was spawned
 * .why = a reporter that names the leak but no longer ends it would still read red; the pid's
 *   own liveness is what proves the box was left clean
 */
const getIsChildAlive = (input: { dir: string }): boolean | null => {
  const pidPath = join(input.dir, 'child.pid');
  if (!existsSync(pidPath)) return null;
  const pid = Number(readFileSync(pidPath, 'utf-8'));
  try {
    process.kill(pid, 0);
    process.kill(pid, 'SIGKILL'); // alive: end it, so a red case leaves the box clean
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code !== 'ESRCH') throw error;
    return false;
  }
};

describe('ReporterAcceptanceBox, through a real jest run', () => {
  // two real jest runs, each with a cold start
  jest.setTimeout(120_000);

  given('[case1] a test that spawns a child and never ends it', () => {
    when('[t0] jest runs the project', () => {
      const result = useThen('it runs', async () =>
        runJest({ dir: genJestProject({ slug: 'reporter-jest-leak', kind: 'leak' }) }),
      );
      then('the run is red, though its one test passed, and the report names the leak', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('Tests:       1 passed, 1 total');
        expect(result.stderr).toContain('✋ ConstraintError: 1 process outlived this acceptance run');
        expect(result.stderr).toContain('setInterval');
      });
      then('the leaked child is gone once jest exits, so the box is left clean', () => {
        expect(result.isChildAlive).toEqual(false);
      });
    });
  });

  given('[case2] a test that spawns no child', () => {
    when('[t0] jest runs the project', () => {
      const result = useThen('it runs', async () =>
        runJest({ dir: genJestProject({ slug: 'reporter-jest-clean', kind: 'clean' }) }),
      );
      then('the run is green, and no leak report prints', () => {
        expect(result.status).toEqual(0);
        expect(result.stderr).not.toContain('outlived');
      });
    });
  });

  given('[case3] a test that outruns its timeout', () => {
    when('[t0] jest runs the project', () => {
      const result = useThen('it runs', async () => {
        const dir = genJestProject({ slug: 'reporter-jest-timeout', kind: 'timeout' });
        return { ...runJest({ dir }), recorded: getRecordedResults({ dir }), dir };
      });
      then('the run is red, and jest wrote the failure as a timeout', () => {
        expect(result.status).toEqual(1);
        expect(result.recorded).toHaveLength(1);
      });
      then("the reporter's matcher reads jest's own timeout message as a timeout", () => {
        // a jest that reworded its timeout would stop the starved note here, not silently in a run
        expect(isTimeoutFailure({ message: result.recorded[0]!.failureMessage })).toEqual(true);
      });
      then('the file path jest hands over is absolute, as the re-run scope needs', () => {
        expect(isAbsolute(result.recorded[0]!.testFilePath)).toEqual(true);
        // jest reports the real path; the temp dir is reached by a symlink, so compare real paths
        expect(realpathSync(result.recorded[0]!.testFilePath)).toEqual(
          realpathSync(join(result.dir, 'leak.test.cjs')),
        );
      });
    });
  });
});
