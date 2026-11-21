import { MalfunctionError } from 'helpful-errors';

import { spawn } from 'node:child_process';

/**
 * .what = run a typescript program in a child node process and capture its own stdout, stderr,
 *   and exit code
 * .why = a contract of the form "not one byte to this process's stdio" is only provable from
 *   outside the process: a spy on this process's streams is a mock in an integration test
 *   (`rule.forbid.integration.mocks`), so the subject runs in a child and its real streams are read
 * .note = the child runs from this process's cwd, so `tsx` resolves this repo's tsconfig; a
 *   program that must write elsewhere chdirs itself
 */
export const runTsProgramInChild = (input: {
  program: string;
}): Promise<{ code: number; stdout: string; stderr: string }> =>
  new Promise((settle, fail) => {
    const child = spawn(
      process.execPath,
      ['-r', 'tsx/cjs', '-e', input.program],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    // .note = deliberate mutation — capture sinks for the child's real stdout and stderr,
    //   local to this run and read once at close
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    // a child that never exits fails the run with a cause, never hangs it to the jest timeout
    const bound = setTimeout(() => {
      child.kill('SIGKILL');
      fail(
        new MalfunctionError('child program did not exit within its bound', {
          boundMs: CHILD_EXIT_BOUND_MS,
          stderr: asUtf8({ chunks: stderr }),
          hint: 'read stderr above; a hang usually means the program left a timer or socket open',
        }),
      );
    }, CHILD_EXIT_BOUND_MS);
    child.on('error', (error) => {
      clearTimeout(bound);
      fail(error);
    });
    child.on('close', (code) => {
      clearTimeout(bound);
      settle({
        code: code ?? 1,
        stdout: asUtf8({ chunks: stdout }),
        stderr: asUtf8({ chunks: stderr }),
      });
    });
  });

/**
 * .what = the text of a captured stream, from its chunks
 * .why = a child stream arrives as buffer chunks; every reader here wants it whole, as utf8
 */
const asUtf8 = (input: { chunks: Buffer[] }): string =>
  Buffer.concat(input.chunks).toString('utf8');

/**
 * .what = how long a child program may run before the run fails
 * .why = long enough for a cold tsx start under a loaded suite; short of the jest timeout, so the
 *   failure names the child rather than the test
 */
const CHILD_EXIT_BOUND_MS = 90000;
