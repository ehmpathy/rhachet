import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * .what = checks if 1password cli is installed
 * .why = fail fast before 1password operations
 *
 * .note = uses `which op` to check if op binary is in PATH
 *
 * 🔴 .note = `env` is passed EXPLICITLY, and it is load-bearing rather than decorative.
 *   `exec` with no `env` inherits the env of the REAL node process — and a jest sandbox hands
 *   its test a COPY of `process.env`, so a suite that sets `process.env.PATH` to choose which
 *   `op` this resolves reaches a variable this call never read. ⇒ without the explicit pass,
 *   the only way to grade the op-present and op-absent arms is to read the host, which is the
 *   failhide `rule.forbid.failhide` forbids. in production the two envs are the same object,
 *   so no runtime behavior changes.
 */
export const isOpCliInstalled = async (): Promise<boolean> => {
  try {
    await execAsync('which op', { env: process.env });
    return true;
  } catch (error) {
    // only a nonzero EXIT means `which` looked and found no `op`. a spawn fault carries a
    // string errno (`ENOENT`, `EACCES`) and is not an absent cli, so it throws
    if (typeof (error as { code?: unknown })?.code !== 'number') throw error;
    return false;
  }
};
