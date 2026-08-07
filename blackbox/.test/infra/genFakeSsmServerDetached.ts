import { type ChildProcess, spawn } from 'node:child_process';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

/**
 * .what = stand up the AWS SSM stand-in as its OWN detached os process, seeded with the given
 *   parameters, and return its base url plus a close() that terminates the process.
 *
 * .why = a jest-spawned CLI subprocess cannot reach an http listener that lives inside the jest
 *   worker process (the worker's inbound loopback is blocked), but it CAN reach a listener in a
 *   separate detached process. so the acceptance journey — which drives the real SDK inside a
 *   spawned `rhx keyrack` subprocess — must point at a stand-in that lives OUT of the worker.
 *   the in-process genFakeSsmServer stays for integration tests (same-process SDK call); this
 *   detached variant serves the acceptance/journey subprocess path.
 */
export const genFakeSsmServerDetached = async (input?: {
  /** parameters to pre-seed, so a get needs no prior put (the reference-read journey) */
  seed?: { name: string; value: string; type?: string }[];
  /**
   * operations to fault-inject an AccessDeniedException on (names match the SSM operation, e.g.
   * 'DescribeParameters'). lets an acceptance test drive the real CLI through a denied call and
   * snapshot the rendered grant-tree — the failtrim forward + grant list, end-to-end
   */
  deny?: string[];
}): Promise<{
  /** the base url to hand to KEYRACK_AWS_SSM_ENDPOINT */
  url: string;
  /** terminate the detached server (call in afterAll) */
  close: () => Promise<void>;
}> => {
  const serverEntry = join(__dirname, 'ssmStandInServer.cjs');
  const child: ChildProcess = spawn(process.execPath, [serverEntry], {
    // its own os process (not a listener inside the worker) so the CLI subprocess can reach it
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      KEYRACK_SSM_STANDIN_SEED: JSON.stringify(input?.seed ?? []),
      KEYRACK_SSM_STANDIN_DENY: JSON.stringify(input?.deny ?? []),
    },
  });

  // guard the pipes explicitly: stdio requests both as 'pipe', so a null here means the child
  // failed to start — fail loud with the cause rather than crash on a null-property read later
  if (!child.stdout || !child.stderr)
    throw new Error(
      'ssm stand-in child process did not open its stdout/stderr pipes',
    );
  const childStdout = child.stdout;
  const childStderr = child.stderr;

  // capture the announced url from the child's stdout (`STANDIN_URL=http://127.0.0.1:<port>`)
  const url = await new Promise<string>((take, fail) => {
    const timeout = setTimeout(
      () => fail(new Error('ssm stand-in never announced its url')),
      8000,
    );
    // read the child's stdout line-by-line via readline — no mutable accumulator (per
    // rule.require.immutable-vars): readline reassembles chunk boundaries internally and emits
    // one complete line at a time, so the announced `STANDIN_URL=...` line is matched without a
    // const-array `.push`. the child prints the marker on its own line (a console.log)
    const lines = createInterface({ input: childStdout });
    lines.on('line', (line) => {
      const match = line.match(/STANDIN_URL=(\S+)/);
      if (match?.[1]) {
        clearTimeout(timeout);
        lines.close();
        take(match[1]);
      }
    });
    childStderr.on('data', (chunk) =>
      // eslint-disable-next-line no-console
      console.error('[ssm-standin] stderr =', String(chunk)),
    );
    child.on('error', (err) => {
      clearTimeout(timeout);
      fail(err);
    });
  });

  return {
    url,
    close: () =>
      new Promise<void>((done) => {
        // a hard fallback so a stuck child never hangs the suite
        const hardKill = setTimeout(() => {
          child.kill('SIGKILL');
          done();
        }, 3000);
        hardKill.unref();
        child.on('exit', () => {
          // a prompt SIGTERM exit clears the fallback so the timer never fires on a dead child
          clearTimeout(hardKill);
          done();
        });
        child.kill('SIGTERM');
      }),
  };
};
