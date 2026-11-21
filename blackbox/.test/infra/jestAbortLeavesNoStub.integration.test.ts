import { type ChildProcess, spawn } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { getAllProcessesWithEnvMark } from './getAllProcessesWithEnvMark';

/**
 * .what = a real jest run aborted by ctrl-c while its test holds three brain stubs, and a read of
 *   the box for any stub left after
 * .why = case 5 of the vision: an abort skips the reporter's sweep (`onRunComplete` never runs), so
 *   what ends a brain there is the stub itself — the ctrl-c its process group hears, its exit on
 *   input end once jest is gone, or its hard cap when it hears neither. one stub per path
 *
 * .note = a terminal's ctrl-c sends SIGINT to the whole foreground process group, so the test
 *   starts jest as a group leader and signals the group, never jest's pid alone
 * .note = DOGFOOD, the mutation that makes it bite (measured 2026-11-16):
 *   | mutation | result |
 *   |---|---|
 *   | the deaf stub's hard cap lifted past the bound | 🔴 red — the deaf detached stub outlives the bound |
 *   | the stub's `process.exit` on input end removed | 🟢 green — an ended input leaves the stub no live handle, so it exits on its own; the detached stub with the long cap guards that |
 */

/** the stub brain, by absolute path */
const STUB_BRAIN = join(__dirname, '../../../src/.test/assets/stubBrainCli.cjs');

/** the cap the detached stub runs under, short so it lands inside the bound */
const STUB_CAP_MS = 3000;

/**
 * .what = this process's env, less the vars this outer jest worker set for itself
 */
const ENV_AS_SHELL = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !/^(JEST_|NODE_ENV$|FORCE_COLOR$|TEST_FNS_RUN$|RHACHET_ACCEPTANCE_RUN_MINTER$)/.test(key),
  ),
);

/**
 * .what = a temp jest project whose one test spawns two marked stubs, flags that they are up, and
 *   parks until the run is aborted
 */
const genJestProjectThatParks = (input: { mark: string }): { dir: string; readyPath: string } => {
  const dir = genTempDir({ slug: 'jest-abort-stub' });
  const readyPath = join(dir, 'stubs.ready');
  writeFileSync(
    join(dir, 'jest.config.cjs'),
    `module.exports = ${JSON.stringify({
      rootDir: dir,
      testMatch: ['<rootDir>/park.test.cjs'],
      testEnvironment: 'node',
      transform: {},
    })};\n`,
  );
  writeFileSync(
    join(dir, 'park.test.cjs'),
    [
      "const { spawn } = require('child_process');",
      "const { writeFileSync } = require('fs');",
      `const env = { ...process.env, RHACHET_TEST_ABORT_MARK: ${JSON.stringify(input.mark)}, CLAUDE_CONFIG_DIR: ${JSON.stringify(join(dir, 'cfg'))}, RHACHET_STUB_BRAIN_MAX_MS: '600000' };`,
      `const envDeafCapped = { ...env, RHACHET_STUB_BRAIN_DEAF: '1', RHACHET_STUB_BRAIN_MAX_MS: '${STUB_CAP_MS}' };`,
      "const stdio = ['pipe', 'ignore', 'ignore'];",
      "test('the test parks with three stubs live', async () => {",
      // attached: in jest's process group, so the ctrl-c reaches it
      `  spawn(process.execPath, [${JSON.stringify(STUB_BRAIN)}], { env, stdio });`,
      // detached, long cap: only its exit on input end can end it once jest is gone
      `  spawn(process.execPath, [${JSON.stringify(STUB_BRAIN)}], { env, stdio, detached: true }).unref();`,
      // detached and deaf: only its hard cap can end it
      `  spawn(process.execPath, [${JSON.stringify(STUB_BRAIN)}], { env: envDeafCapped, stdio, detached: true }).unref();`,
      `  writeFileSync(${JSON.stringify(readyPath)}, 'ready');`,
      '  await new Promise(() => undefined);',
      '}, 600000);',
      '',
    ].join('\n'),
  );
  return { dir, readyPath };
};

/**
 * .what = settle once a file exists, or throw past a bound
 */
const waitForFile = async (input: { path: string; boundMs: number }): Promise<void> => {
  const deadline = Date.now() + input.boundMs;
  while (!existsSync(input.path)) {
    if (Date.now() > deadline) throw new Error(`no ${input.path} within ${input.boundMs}ms`);
    await new Promise((wake) => setTimeout(wake, 100));
  }
};

/**
 * .what = the marked stubs still alive once the bound has passed, or none sooner
 */
const getAllStubsLeftAfter = async (input: {
  envMark: string;
  boundMs: number;
}): Promise<Array<{ pid: number; command: string }>> => {
  const deadline = Date.now() + input.boundMs;
  const read = async (): Promise<Array<{ pid: number; command: string }>> =>
    (await getAllProcessesWithEnvMark({ envMark: input.envMark, pidsExcluded: [] })).filter(
      (proc) => proc.command.includes('stubBrainCli'),
    );
  // .note = deliberate mutation — a bounded poll, local to this read
  let found = await read();
  while (found.length > 0 && Date.now() < deadline) {
    await new Promise((wake) => setTimeout(wake, 200));
    found = await read();
  }
  return found;
};

describe('a jest run aborted by ctrl-c', () => {
  // a cold jest start, the stubs, then the cap
  jest.setTimeout(90_000);

  given('[case1] a test that holds an attached and a detached brain stub', () => {
    const mark = getUuid();
    const envMark = `RHACHET_TEST_ABORT_MARK=${mark}`;
    const scene = useBeforeAll(async () => {
      const project = genJestProjectThatParks({ mark });
      const run: ChildProcess = spawn(
        process.execPath,
        [require.resolve('jest/bin/jest'), '-c', join(project.dir, 'jest.config.cjs')],
        { cwd: project.dir, env: ENV_AS_SHELL, stdio: 'ignore', detached: true },
      );
      const exited = new Promise<void>((settle) => run.on('exit', () => settle()));
      await waitForFile({ path: project.readyPath, boundMs: 60_000 });
      const stubsBefore = (await getAllProcessesWithEnvMark({ envMark, pidsExcluded: [] })).filter(
        (proc) => proc.command.includes('stubBrainCli'),
      );
      return { run, exited, stubsBefore };
    });
    afterAll(() => {
      // end whatever a red case left, so the box stays clean
      try {
        process.kill(-(scene.run.pid ?? 0), 'SIGKILL');
      } catch (error) {
        if ((error as NodeJS.ErrnoException | null)?.code !== 'ESRCH') throw error;
      }
    });

    when('[t0] ctrl-c reaches the run', () => {
      const result = useBeforeAll(async () => {
        process.kill(-(scene.run.pid ?? 0), 'SIGINT');
        await scene.exited;
        const left = await getAllStubsLeftAfter({ envMark, boundMs: STUB_CAP_MS + 7_000 });
        left.forEach((proc) => {
          try {
            process.kill(proc.pid, 'SIGKILL');
          } catch (error) {
            if ((error as NodeJS.ErrnoException | null)?.code !== 'ESRCH') throw error;
          }
        });
        return { left };
      });

      then('all three stubs were live before the abort', () => {
        expect(scene.stubsBefore.length).toEqual(3);
      });

      then('no stub outlives the abort past its cap', () => {
        expect(result.left).toEqual([]);
      });
    });
  });
});
