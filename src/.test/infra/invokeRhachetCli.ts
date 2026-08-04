import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * .what = path to the rhachet CLI entrypoint for tests
 * .why = uses TypeScript source directly so tests work without compiled dist/
 */
const RHACHET_BIN = resolve(__dirname, 'runRhachetCli.ts');

/**
 * .what = the repo's own tsx binary, by absolute path
 * .why = resolved directly rather than through `npx`, because `npx` is a HOST
 *        dependency whose behavior varies by shell config, and this spawn runs under
 *        `shell: '/bin/bash'` — which sources $BASH_ENV, where this repo's own
 *        documented setup (howto.test-local-rhachet) defines an `npx()` shell
 *        FUNCTION. that function falls through to `pnpm exec` when the cwd has no
 *        local binary, and `pnpm exec` relocates cwd to the package root.
 *
 *        that relocation silently breaks any test whose subject reads `process.cwd()`
 *        — discoverSkillExecutables resolves `.agent` against it, so a test that
 *        passes `cwd: tempDir` had its skills looked up in the REPO instead, and the
 *        temp fixture was never seen. it presents as "no skill found" beside a list of
 *        the repo's own skills, with no hint that cwd moved.
 *
 *        an absolute path removes the host from the loop entirely
 *        (rule.forbid.bare-host-deps, rule.require.hermetic-tests)
 */
const TSX_BIN = resolve(__dirname, '../../../node_modules/.bin/tsx');

/**
 * .what = invokes the rhachet CLI via the repo's own tsx
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
  const result = spawnSync(TSX_BIN, [RHACHET_BIN, ...input.args], {
    cwd: input.cwd,
    input: input.stdin,
    encoding: 'utf-8',
    shell: '/bin/bash',
    env: process.env, // explicitly pass current env (includes modified HOME)
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
