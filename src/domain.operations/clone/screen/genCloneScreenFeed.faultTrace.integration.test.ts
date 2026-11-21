import { genTempDir, given, then, useThen, when } from 'test-fns';

import { runTsProgramInChild } from '@src/.test/infra/runTsProgramInChild';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getCloneTraceLogPath } from '../getCloneTraceLogPath';

/**
 * .what = build a screen feed with its DEFAULT trace sink in a child process, fault its emulator
 *   write, and capture the child's real stdout and stderr
 * .why = the feed runs inside the attended daemon, beside the mirror; its fault trace is a daemon
 *   line, and only the default sink is the one prod runs when no `trace` is passed
 * .note = the emulator is a stand-in whose write throws: the real @xterm/headless takes any
 *   string, so a fault can only be provoked by a module that refuses. the sink, the fs, and the
 *   process stdio are all real
 * .note = the child requires the module from the repo cwd (so tsx resolves this repo's
 *   tsconfig), then chdirs to a temp dir, so the trace log lands there and never in this tree
 */
const runFeedThatFaults = (input: {
  cwd: string;
}): Promise<{ code: number; stdout: string; stderr: string }> => {
  const feedPath = JSON.stringify(join(__dirname, 'genCloneScreenFeed'));
  const program = [
    `const { genCloneScreenFeed } = require(${feedPath});`,
    `process.chdir(${JSON.stringify(input.cwd)});`,
    `const emulator = { Terminal: class {`,
    `  write() { throw new Error('emulator write faulted'); }`,
    `  resize() {}`,
    `  dispose() {}`,
    `} };`,
    `const feed = genCloneScreenFeed({ cols: 80, rows: 24 }, { emulator });`,
    `feed.feed('boom');`,
    `process.exit(feed.lastFault() ? 0 : 3);`,
  ].join('\n');
  return runTsProgramInChild({ program });
};

describe('genCloneScreenFeed.faultTrace', () => {
  given('[case1] a screen feed with its default trace sink', () => {
    when('[t0] its emulator write faults', () => {
      const run = useThen('the feed retains the fault', async () => {
        const cwd = genTempDir({ slug: 'feed-fault-trace' });
        const result = await runFeedThatFaults({ cwd });
        return {
          ...result,
          log: readFileSync(
            getCloneTraceLogPath({ repoPath: cwd, at: new Date() }),
            'utf8',
          ),
        };
      });

      then('the fault is retained, so the child exits 0', () => {
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

      then('the fault line lands in the trace log, whole', () => {
        // one line: its time and the daemon pid, then the fault whole
        expect(run.log).toMatch(
          /^\d{4}-\d{2}-\d{2}T[\d:.]+Z pid=\d+ 😶 clone screen feed fault — degraded to feed-faulted, re-enroll to clear: emulator write faulted\n$/,
        );

        // the words an operator reads, stamp masked, so a reword shows in review
        expect(
          run.log.replace(/^\S+ pid=\d+ /, '<iso> pid=<n> '),
        ).toMatchSnapshot();
      });
    });
  });
});
