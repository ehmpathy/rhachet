import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * .what = path to the rhachet CLI entrypoint for tests
 * .why = uses TypeScript source directly so tests work without compiled dist/
 */
const RHACHET_BIN = resolve(__dirname, 'runRhachetCli.ts');

/**
 * .what = invokes the rhachet CLI via npx tsx
 * .why = standardizes CLI invocation for integration tests
 */
export const invokeRhachetCli = (input: {
  /** CLI args after 'rhachet' (e.g., ['run', '--skill', 'foo']) */
  args: string[];
  /** working directory for the command */
  cwd: string;
  /** optional stdin data to pipe */
  stdin?: string;
  /** whether to log output on failure (default: true) */
  logOnError?: boolean;
}): SpawnSyncReturns<string> => {
  const result = spawnSync('npx', ['tsx', RHACHET_BIN, ...input.args], {
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

/**
 * .what = invokes rhachet run --skill
 * .why = common pattern for skill execution tests
 */
export const invokeRhachetRun = (input: {
  skill: string;
  cwd: string;
  stdin?: string;
  repo?: string;
  role?: string;
}): SpawnSyncReturns<string> => {
  const args = ['run', '--skill', input.skill];
  if (input.repo) args.push('--repo', input.repo);
  if (input.role) args.push('--role', input.role);

  return invokeRhachetCli({
    args,
    cwd: input.cwd,
    stdin: input.stdin,
  });
};
