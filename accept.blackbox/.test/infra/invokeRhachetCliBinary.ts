import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * .what = paths to CLI binaries
 * .why = acceptance tests invoke compiled binaries for black-box test
 */
const RHACHET_BIN = resolve(__dirname, '../../../bin/run');
const RHX_BIN = resolve(__dirname, '../../../bin/rhx');

/**
 * .what = invokes the compiled rhachet or rhx CLI binary
 * .why = enables true black-box acceptance test against the built artifact
 */
export const invokeRhachetCliBinary = (input: {
  /** which binary to invoke (default: 'rhachet') */
  binary?: 'rhachet' | 'rhx';
  /** CLI args after the binary name (e.g., ['run', '--skill', 'foo'] for rhachet, ['foo'] for rhx) */
  args: string[];
  /** cwd for the command */
  cwd: string;
  /** optional stdin data to pipe */
  stdin?: string;
  /** whether to log output on failure (default: true) */
  logOnError?: boolean;
  /** optional env vars to merge with process.env */
  env?: Record<string, string | undefined>;
}): SpawnSyncReturns<string> => {
  const binPath = input.binary === 'rhx' ? RHX_BIN : RHACHET_BIN;
  const result = spawnSync(binPath, input.args, {
    cwd: input.cwd,
    input: input.stdin,
    encoding: 'utf-8',
    shell: '/bin/bash',
    env: input.env ? { ...process.env, ...input.env } : undefined,
  });

  // log output for debug on failure
  const shouldLog = input.logOnError ?? true;
  if (shouldLog && result.status !== 0) {
    console.error('stderr:', result.stderr);
    console.error('stdout:', result.stdout);
  }

  return result;
};

/**
 * .what = invokes multiple CLI commands chained with &&
 * .why = enables test of commands that need to share shell state
 *
 * .note = returns stdout/stderr of the last command only (prior commands redirect to /dev/null)
 */
export const invokeRhachetCliBinaryChain = (input: {
  /** which binary to invoke (default: 'rhachet') */
  binary?: 'rhachet' | 'rhx';
  /** array of arg arrays, each executed in sequence with && */
  argsChain: string[][];
  /** cwd for the command */
  cwd: string;
  /** whether to log output on failure (default: true) */
  logOnError?: boolean;
  /** optional env vars to merge with process.env */
  env?: Record<string, string | undefined>;
}): SpawnSyncReturns<string> => {
  const binPath = input.binary === 'rhx' ? RHX_BIN : RHACHET_BIN;

  // build the chained command string (redirect all but last to /dev/null)
  const commands = input.argsChain.map((args, i) => {
    const cmd = `"${binPath}" ${args.map((a) => `"${a}"`).join(' ')}`;
    // redirect stdout to /dev/null for all but the last command
    return i < input.argsChain.length - 1 ? `${cmd} > /dev/null` : cmd;
  });
  const chainedCommand = commands.join(' && ');

  const result = spawnSync('bash', ['-c', chainedCommand], {
    cwd: input.cwd,
    encoding: 'utf-8',
    env: input.env ? { ...process.env, ...input.env } : undefined,
  });

  // log output for debug on failure
  const shouldLog = input.logOnError ?? true;
  if (shouldLog && result.status !== 0) {
    console.error('stderr:', result.stderr);
    console.error('stdout:', result.stdout);
  }

  return result;
};
