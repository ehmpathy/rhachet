import { spawn } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';
import {
  asUniDateTime,
  getDuration,
  type UniDateTimeRange,
  type UniDuration,
} from '@ehmpathy/uni-time';
import chalk from 'chalk';
import { UnexpectedCodePathError } from 'helpful-errors';
import { asSerialBase64, asSerialJSON, type Serializable } from 'serde-fns';

import type { InvokeOpts } from '../../domain/objects/InvokeOpts';

/**
 * .what = gets the standard output prefix for this attempt
 * .why =
 *   - makes it easy to detect logs per attempt
 */
const getLogPrefixForAttempt = (input: { attempt: number; peers: number }) => {
  const palette = [
    chalk.cyan,
    chalk.green,
    chalk.magenta,
    chalk.yellow,
    chalk.blue,
    chalk.hex('#ffb5a7'), // pastel coral
    chalk.hex('#b5ead7'), // pastel mint
    chalk.hex('#ffd6a5'), // pastel orange
    chalk.hex('#e2f0cb'), // pastel lime
    chalk.hex('#d2b48c'), // pastel wood
    chalk.hex('#ffe5ec'), // pastel rose
  ];
  const color = palette[(input.attempt - 1) % palette.length]!;
  const pads = String(input.peers).length;
  const prefix = color(`○ i${String(input.attempt).padStart(pads, '0')} › `);
  return prefix;
};

/**
 * .what = perform a single skill execution in an isolated child thread (subprocess)
 * .why =
 *   - isolates side-effects and resources per attempt
 *   - enables parallel fan-out while keeping logs readable per attempt
 * .how =
 *   - invokes a worker which spins up an isolated thread to execute the performance
 *   - streams the logs to main thread with identifiable prefix, for observability
 */
export const invokePerformInIsolatedThread = async (input: {
  opts: InvokeOpts<{ config: string; attempt: number }>;
  peer: {
    /**
     * the total number of peer threads that we expect. used to format log prefixes
     */
    attempts: number;
  };
}): Promise<{
  attempt: number;
  code: number | null;
  clock: {
    range: UniDateTimeRange;
    duration: UniDuration;
  };
}> => {
  // grab the attempt index from the argv
  const attempt =
    input.opts.attempt ??
    UnexpectedCodePathError.throw(
      'attempt should have been declared in argv if this was called',
      { argv: input.opts },
    );

  // grab the prefix to log with
  const logPrefix = getLogPrefixForAttempt({
    attempt,
    peers: input.peer.attempts,
  });

  // serialize the payload
  const payload = asSerialBase64(
    asSerialJSON({ opts: input.opts as Serializable }),
  );

  // define the executor
  const EXECUTOR_PATH = path.resolve(
    __dirname,
    'performInIsolatedThread.execute',
  );
  const TSX_CLI = require.resolve('tsx/cli');
  return await new Promise((resolve) => {
    // spawn child thread that'll run the executor, with stdout/stderr streams exposed
    const child = spawn(process.execPath, [TSX_CLI, EXECUTOR_PATH], {
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      env: {
        ...process.env,
        RHACHET_ATTEMPT: String(input.opts.attempt),
        RHACHET_ATTEMPTS: String(input.peer.attempts),
        RHACHET_INVOKE_OPTS_PAYLOAD: payload,
      },
    });

    // forward the workers logs, with the prefix attached, for observability
    const pipe = (
      stream: NodeJS.ReadableStream,
      write: (s: string) => void,
    ) => {
      const rl = readline.createInterface({ input: stream });
      rl.on('line', (line) => write(logPrefix + line));
    };
    pipe(child.stdout!, (s) => process.stdout.write(s + '\n'));
    pipe(child.stderr!, (s) => process.stderr.write(s + '\n'));

    // resolve this procedure on exit of worker
    const beganAt = asUniDateTime(new Date());
    child.once('exit', (code) => {
      const range = { since: beganAt, until: asUniDateTime(new Date()) };
      resolve({
        attempt,
        code,
        clock: { range, duration: getDuration({ of: { range } }) },
      });
    });
  });
};

// this is the procedure folks should callers will want when they desire to perform in an isolated thread
export { invokePerformInIsolatedThread as performInIsolatedThread };
