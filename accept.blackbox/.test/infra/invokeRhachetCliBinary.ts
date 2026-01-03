import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * .what = path to the compiled rhachet CLI binary
 * .why = acceptance tests use compiled dist/ for true black-box testing
 */
const RHACHET_BIN = resolve(__dirname, '../../../bin/run');

/**
 * .what = invokes the compiled rhachet CLI binary
 * .why = enables true black-box acceptance testing against the built artifact
 */
export const invokeRhachetCliBinary = (input: {
  /** CLI args after 'rhachet' (e.g., ['run', '--skill', 'foo']) */
  args: string[];
  /** working directory for the command */
  cwd: string;
  /** optional stdin data to pipe */
  stdin?: string;
  /** whether to log output on failure (default: true) */
  logOnError?: boolean;
}): SpawnSyncReturns<string> => {
  const result = spawnSync(RHACHET_BIN, input.args, {
    cwd: input.cwd,
    input: input.stdin,
    encoding: 'utf-8',
    shell: '/bin/bash',
  });

  // log output for debug on failure
  const shouldLog = input.logOnError ?? true;
  if (shouldLog && result.status !== 0) {
    console.error('stderr:', result.stderr);
    console.error('stdout:', result.stdout);
  }

  return result;
};
