import { genTempDir, given, then, useThen, when } from 'test-fns';

import { runTsProgramInChild } from '@src/.test/infra/runTsProgramInChild';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getCloneTraceLogPath } from '../getCloneTraceLogPath';

/**
 * .what = build a write queue with its DEFAULT trace sink in a child process, fault its pty
 *   write, and capture the child's real stdout and stderr
 * .why = a daemon FAULT, not only a stall, must stay off an attended pane. the queue's fault
 *   trace is the path a pty write fault takes, and only the default sink is the one prod runs
 * .note = the child requires the module from the repo cwd (so tsx resolves this repo's
 *   tsconfig), then chdirs to a temp dir, so the trace log lands there and never in this tree
 */
const runQueueThatFaults = (input: {
  cwd: string;
}): Promise<{ code: number; stdout: string; stderr: string }> => {
  const queuePath = JSON.stringify(join(__dirname, 'genCloneWriteQueue'));
  const program = [
    `const { genCloneWriteQueue } = require(${queuePath});`,
    `process.chdir(${JSON.stringify(input.cwd)});`,
    `const queue = genCloneWriteQueue({`,
    `  write: () => { throw new Error('pty write faulted'); },`,
    `});`,
    `queue.enqueue({`,
    `  message: 'boom',`,
    `  force: false,`,
    `  onQueued: () => undefined,`,
    `  onDelivered: () => process.exit(3),`,
    `  onRejected: () => process.exit(0),`,
    `});`,
  ].join('\n');
  return runTsProgramInChild({ program });
};

describe('genCloneWriteQueue.faultTrace', () => {
  given('[case1] a write queue with its default trace sink', () => {
    when('[t0] its pty write faults', () => {
      const run = useThen('the queue demotes the write', async () => {
        const cwd = genTempDir({ slug: 'queue-fault-trace' });
        const result = await runQueueThatFaults({ cwd });
        return {
          ...result,
          log: readFileSync(
            getCloneTraceLogPath({ repoPath: cwd, at: new Date() }),
            'utf8',
          ),
        };
      });

      then('the write is rejected, so the child exits 0', () => {
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
          /^\d{4}-\d{2}-\d{2}T[\d:.]+Z pid=\d+ 💥 clone write fault — demoted to pty-write-fault \(re-enroll remedy\): pty write faulted\n$/,
        );

        // the words an operator reads, stamp masked, so a reword shows in review
        expect(
          run.log.replace(/^\S+ pid=\d+ /, '<iso> pid=<n> '),
        ).toMatchSnapshot();
      });
    });
  });
});
