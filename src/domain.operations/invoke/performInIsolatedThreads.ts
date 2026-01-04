import Bottleneck from 'bottleneck';
import { BadRequestError } from 'helpful-errors';
import { asDurationInWords } from 'iso-time';

import type { InvokeOpts } from '@src/domain.objects/InvokeOpts';

import { addAttemptQualifierToOutputPath } from './addAttemptQualifierToOutputPath';
import { performInIsolatedThread } from './performInIsolatedThread.invoke';

/**
 * .what = performs a skill in one-or-more isolated threads concurrently
 * .why =
 *   - enables multiple attempts of the same performance, to compare different takes of the same skill
 *   - given llm's may produce divergent results on reinvocation, this is useful to...
 *     - support the attempt-&-blend pattern
 *     - evaluate the consistency of a skill applied to your ask
 *     - etc
 * .how =
 *    - spawns isolated child threads and performs the skill within each of those threads
 *    - supports two modes:
 *      - 'stitch': executes via performInCurrentThreadForStitch (thread stitcher)
 *      - 'actor': executes via performInCurrentThreadForActor (brain.act)
 */
export const performInIsolatedThreads = async (input: {
  opts: InvokeOpts<{
    config: string;
    mode: 'stitch' | 'actor';
    output?: string;
    // stitch-mode fields
    ask?: string;
    // actor-mode fields
    role?: string;
    skill?: string;
    brain?: string;
  }>;
}): Promise<void> => {
  // validate that attempts were requested
  if (!input.opts.attempts)
    BadRequestError.throw('--attempts was not provided', {
      argv: input.opts,
    });

  // validate that more than one attempt was declared
  const attempts = Number(input.opts.attempts);
  if (!Number.isInteger(attempts))
    BadRequestError.throw('--attempts must be an integer', {
      attempts: { input: input.opts.attempts, asNum: input.opts.attempts },
    });
  if (attempts < 1)
    BadRequestError.throw('--attempts must be greater than one', {
      attempts: { input: input.opts.attempts, asNum: input.opts.attempts },
    });

  // parse concurrency (defaults to 3 if unset); concurrency governs parallelism, not the number of attempts
  const concurrency = input.opts.concurrency
    ? Number(input.opts.concurrency)
    : 3;
  if (!Number.isInteger(concurrency))
    BadRequestError.throw('--concurrency must be an integer', {
      concurrency: {
        input: input.opts.concurrency,
        asNum: input.opts.concurrency,
      },
    });
  if (concurrency < 1)
    BadRequestError.throw('--concurrency must be greater than one', {
      concurrency: {
        input: input.opts.concurrency,
        asNum: input.opts.concurrency,
      },
    });

  // cast the argv per attempt; i.e., replace the output in each
  const attemptArgvs = Array.from({ length: attempts }, (_, i) => ({
    ...input.opts,
    attempt: i + 1,

    // qualify the output, if output was specified
    output: input.opts.output
      ? addAttemptQualifierToOutputPath({
          path: input.opts.output,
          attempt: i + 1,
        })
      : undefined,
  }));

  // orchestrate the child processes using bottleneck for concurrency control
  const bottleneck = new Bottleneck({ maxConcurrent: concurrency });
  const beganAt = Date.now();
  const results = await Promise.all(
    attemptArgvs.map((argv) =>
      bottleneck.schedule(() =>
        performInIsolatedThread({
          opts: argv,
          peer: { attempts },
        }),
      ),
    ),
  );
  const wallTime = ((Date.now() - beganAt) / 1000).toFixed(1) + 's';

  // print summary: per-attempt status + durations
  const rows = results.map((r) => ({
    // attempt: r.attempt, // ?: console.table already includes an "index" column which we cant remove, so this is redundant in display
    status: r.code === 0 ? 'ok' : 'fail',
    duration: asDurationInWords(r.clock.duration),
  }));
  console.log(`\nsummary (${results.length} attempts):`);
  console.table(rows);

  // print overall outcome banner
  const ok = rows.filter((r) => r.status === 'ok').length;
  const fail = rows.length - ok;
  console.log(
    `\n${ok} succeeded, ${fail} failed • total wall time: ${wallTime}`,
  );

  // print output file paths in order
  if (input.opts.output) {
    console.log('\noutputs:');
    for (const argv of attemptArgvs) console.log('-', argv.output);
  }

  // parent exit code: 0 iff all succeed; non-zero if any fail
  process.exitCode = fail > 0 ? 1 : 0;
};
