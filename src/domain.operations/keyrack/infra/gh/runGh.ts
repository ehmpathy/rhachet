import { spawnSync } from 'node:child_process';

/**
 * .what = the result of one gh cli invocation
 * .why = a minimal, injectable shape so callers depend on data, not on spawnSync
 */
export interface GhRunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

/**
 * .what = the injectable seam for every gh cli call
 * .why = communicators receive this via context so tests pass a fake instead of
 *        a call to the real `gh` binary; `runGh` is the sole real i/o boundary
 */
export type GhRun = (input: { args: string[] }) => GhRunResult;

/**
 * .what = the real gh runner — spawns the `gh` cli and returns its raw result
 * .why = the one true communicator; every other infra/gh function is a pure
 *        transform over an injected GhRun and is unit-testable with a fake
 *
 * .note = this leaf is verified by real integration tests (5.3.verification),
 *         since it is the only code that actually shells out to `gh`
 */
export const runGh: GhRun = (input) => {
  const result = spawnSync('gh', input.args, {
    encoding: 'utf-8',
    stdio: 'pipe',
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
};
