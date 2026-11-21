import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useThen, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { runTsProgramInChild } from '@src/.test/infra/runTsProgramInChild';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getCloneSocketPath } from '../getCloneSocketPath';
import { getCloneTraceLogPath } from '../getCloneTraceLogPath';

/**
 * .what = stand up a real clone socket server with its DEFAULT trace sink in a child process,
 *   stall its event loop past the lag bound, and capture the child's real stdout and stderr
 * .why = the defect: an attended daemon's stderr IS the human's pane, and the default sink tee'd
 *   every trace line there, so `clone daemon event loop stalled <N>ms` painted over the
 *   brain-cli's input row. only a separate process lets the test read that stderr for real,
 *   with no spy (`rule.forbid.integration.mocks`), and only the DEFAULT sink is the one prod runs
 * .note = the child requires the module from the repo cwd (so tsx resolves this repo's
 *   tsconfig), then chdirs to a temp dir, so the trace log lands there and never in this tree
 * .note = the busy wait outlasts one tick plus the 2000ms bound, so the next tick's drift is
 *   past the bound however the timer was phased
 * .note = the stall runs from a timer, so the event loop has started: `ready` settles before
 *   the loop's first turn, and loop utilization counts naught before that turn
 */
const runServerThatStalls = (input: {
  cwd: string;
  socketPath: string;
}): Promise<{ code: number; stdout: string; stderr: string }> => {
  const serverPath = JSON.stringify(join(__dirname, 'genCloneSocketServer'));
  const program = [
    `const { genCloneSocketServer } = require(${serverPath});`,
    `process.chdir(${JSON.stringify(input.cwd)});`,
    `const server = genCloneSocketServer({`,
    `  socketPath: ${JSON.stringify(input.socketPath)},`,
    `  write: () => undefined,`,
    `  isBrainCliAlive: () => true,`,
    `  read: () => ({ live: false, reason: 'feed-not-live' }),`,
    `  settle: async () => {},`,
    `});`,
    `server.ready.then(() => setTimeout(() => {`,
    `  const until = Date.now() + 3600;`,
    `  while (Date.now() < until) {}`,
    `  setTimeout(() => server.close().then(() => process.exit(0)), 1500);`,
    `}, 50));`,
  ].join('\n');
  return runTsProgramInChild({ program });
};

describe('genCloneSocketServer.stallTrace', () => {
  given('[case1] a daemon socket server with its default trace sink', () => {
    when('[t0] its event loop stalls past the lag bound', () => {
      const run = useThen('the daemon runs and stalls', async () => {
        const cwd = genTempDir({ slug: 'socket-stall-trace' });
        const socketPath = getCloneSocketPath({ serial: getUuid() });
        if (!socketPath)
          throw new ConstraintError('no clone socket path on this host', {
            hint: 'clone sockets need a posix host (process.getuid); run on linux or macos',
          });
        const result = await runServerThatStalls({ cwd, socketPath });
        return {
          ...result,
          log: readFileSync(
            getCloneTraceLogPath({ repoPath: cwd, at: new Date() }),
            'utf8',
          ),
        };
      });

      then('the daemon exits 0', () => {
        expect(run.code).toEqual(0);
      });

      then(
        'not one byte reaches the daemon stderr — the pane — nor its stdout',
        () => {
          expect({ stdout: run.stdout, stderr: run.stderr }).toEqual({
            stdout: '',
            stderr: '',
          });
        },
      );

      then(
        'the stall line lands in the trace log, with its drift and both measures',
        () => {
          const match =
            /^\d{4}-\d{2}-\d{2}T[\d:.]+Z pid=\d+ clone daemon event loop stalled (\d+)ms \(cpu (\d+)ms, loop active (\d+)ms\)$/m.exec(
              run.log,
            );
          expect(match).not.toBeNull();
          const [drift, cpu, active] = [match![1], match![2], match![3]].map(
            Number,
          );

          // the drift is the stall itself, so it must reach the lag bound
          expect(drift).toBeGreaterThanOrEqual(2000);

          // the stall was a sync span on the loop, so loop active must carry it
          expect(active).toBeGreaterThanOrEqual(2000);

          // both measures are taken over the same span as the drift, so neither may exceed it by
          //   more than one tick of slack
          expect(active).toBeLessThanOrEqual(drift! + 1000);
          expect(cpu).toBeLessThanOrEqual(drift! + 1000);

          // the words an operator reads, as the real daemon writes them; stamp and measures masked
          expect(
            match![0]
              .replace(/^\S+ pid=\d+ /, '<iso> pid=<n> ')
              .replace(/\d+ms/g, '<n>ms'),
          ).toMatchSnapshot();
        },
      );

      then(
        'the liveness line lands in the trace log, once — so a silent log reads as health',
        () => {
          // an absent stall line and a watch that never ran leave the same log; this line is
          //   what parts them, so its presence is asserted, never assumed
          const lines = run.log
            .split('\n')
            .filter((line) => line.includes('clone daemon loop watch live'));
          expect(lines).toHaveLength(1);
          expect(
            lines[0]!.replace(/^\S+ pid=\d+ /, '<iso> pid=<n> '),
          ).toMatchSnapshot();
        },
      );
    });
  });
});
