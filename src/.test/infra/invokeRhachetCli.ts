import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * .what = path to the rhachet CLI entrypoint for tests
 * .why = uses TypeScript source directly so tests work without compiled dist/
 */
const RHACHET_BIN = resolve(__dirname, 'runRhachetCli.ts');

/**
 * .what = the local tsx binary that runs the TS entrypoint
 * .why = the CLI discovers `.agent` from `process.cwd()`, so the spawned child's
 *        cwd MUST be exactly the passed `cwd`. spawning `tsx` DIRECTLY (an absolute
 *        binary path, shell: false) keeps that guarantee. the prior `npx` +
 *        `shell: '/bin/bash'` path did NOT: a non-interactive bash sources
 *        `$BASH_ENV`, which in some dev setups defines an `npx` shell function that
 *        falls back to `pnpm exec` when the cwd has no local `node_modules` (true
 *        for a temp dir) — and that wrapper re-derives the workspace, so the child
 *        discovered the WORKTREE-root `.agent` instead of the temp dir's. a direct
 *        binary spawn cannot be hijacked by an ambient shell wrapper, so the test
 *        is hermetic (rule.require.hermetic-tests) and cwd-deterministic
 */
const TSX_BIN = resolve(__dirname, '../../../node_modules/.bin/tsx');

/**
 * .what = invokes the rhachet CLI via the local tsx binary
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
  // spawn tsx directly (no shell) so the child's cwd is exactly `input.cwd` — see
  // TSX_BIN note on why the prior `npx` + bash-shell path leaked a foreign cwd
  const result = spawnSync(TSX_BIN, [RHACHET_BIN, ...input.args], {
    cwd: input.cwd,
    input: input.stdin,
    encoding: 'utf-8',
    env: process.env, // explicitly pass current env (includes modified HOME)
    // bound the child so a hung tsx/CLI can never wedge the suite forever; matches the
    // blackbox invokeRhachetCliBinary (120s) + the prod spawn-site convention
    timeout: 120_000,
  });

  // log output for debug on failure
  const shouldLog = input.logOnError ?? true;
  if (shouldLog && result.status !== 0) {
    console.error('stderr:', result.stderr);
    console.error('stdout:', result.stdout);
  }

  return result;
};
