import { MalfunctionError } from 'helpful-errors';
import { given, then, useThen, when } from 'test-fns';

import { spawn } from 'node:child_process';
import { join } from 'node:path';

/**
 * .what = run the watch in a child, stop that whole process with SIGSTOP for a span, then let it
 *   go on, and capture the stall line it reports
 * .why = the host-starved class is the incident's own signature: the loop sat idle in its poll and
 *   was woken late because the host gave it no cpu. a SIGSTOP is exactly that, from outside the
 *   process, so the line it yields is the real starved shape, with no spy and no fake clock
 * .note = the watch writes to the child's stdout here (its injected sink), which the test reads
 */
const runWatchThenStarve = (input: {
  starveMs: number;
}): Promise<{ line: string }> =>
  new Promise((settle, fail) => {
    const watchPath = JSON.stringify(join(__dirname, 'genCloneLoopLagWatch'));
    const program = [
      `const { genCloneLoopLagWatch } = require(${watchPath});`,
      `genCloneLoopLagWatch({ trace: (line) => process.stdout.write(line), tickMs: 100, lagThresholdMs: 1000 });`,
      `setTimeout(() => process.stdout.write('ready\\n'), 500);`,
      `setTimeout(() => process.exit(0), ${input.starveMs + 3000});`,
    ].join('\n');
    const child = spawn(process.execPath, ['-r', 'tsx/cjs', '-e', program], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });

    // .note = deliberate mutation — a capture sink for the child's stdout and a once-only flag
    //   for the starve, both local to this run
    const out: Buffer[] = [];
    let starved = false;
    child.stdout.on('data', (chunk: Buffer) => {
      out.push(chunk);
      if (starved) return;
      if (!Buffer.concat(out).toString('utf8').includes('ready\n')) return;
      const pid = child.pid;
      if (pid === undefined)
        return fail(
          new MalfunctionError('the child has no pid to stop', {
            hint: 'the spawn failed; read the child error above',
          }),
        );

      // the child is up and its watch ticks; starve the whole process once its loop sits idle in
      //   its poll (a stop that lands mid-callback reads as busy time, see the watch's docblock),
      //   then let it go on
      starved = true;
      setTimeout(() => {
        process.kill(pid, 'SIGSTOP');
        setTimeout(() => process.kill(pid, 'SIGCONT'), input.starveMs);
      }, 250);
    });
    child.on('error', fail);
    child.on('close', () => {
      const line = Buffer.concat(out)
        .toString('utf8')
        .split('\n')
        .find((row) => row.startsWith('clone daemon event loop stalled'));
      if (!line)
        return fail(
          new MalfunctionError('the starved child reported no stall line', {
            out: Buffer.concat(out).toString('utf8'),
            hint: 'the watch did not fire; check its tick and bound',
          }),
        );
      settle({ line });
    });
  });

describe('genCloneLoopLagWatch', () => {
  given('[case1] a watch in a process the host stops for a span', () => {
    when('[t0] the process is stopped, then let go on', () => {
      const starveMs = 2500;
      const run = useThen('the watch reports the stall', async () =>
        runWatchThenStarve({ starveMs }),
      );

      then(
        'the line reads the host-starved class — drift near the span, loop active far below it',
        () => {
          const match =
            /^clone daemon event loop stalled (\d+)ms \(cpu (\d+)ms, loop active (\d+)ms\)$/.exec(
              run.line,
            );
          expect(match).not.toBeNull();
          const driftMs = Number(match?.[1]);
          const cpuMs = Number(match?.[2]);
          const activeMs = Number(match?.[3]);
          expect(driftMs).toBeGreaterThanOrEqual(starveMs - 500);
          expect(activeMs).toBeLessThan(driftMs * 0.3);
          expect(cpuMs).toBeLessThan(driftMs * 0.3);
        },
      );
    });
  });
});
