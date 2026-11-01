import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * .what = the XDG_RUNTIME_DIR a test hands to a keyrack call made from a test dir: a short
 *   path under os.tmpdir(), keyed by a hash of that test dir
 * .why = the keyrack daemon binds `<runtime>/keyrack.<session>.<hash>.sock`, and a unix
 *   socket address is capped at ~104 bytes (`sun_path`, darwin; 108 on linux). a runtime dir
 *   under a `genTempDir` inherits the checkout's path, so a long worktree name pushes the
 *   socket past the cap and the connect fails with EINVAL. a short base fits on any checkout
 * .note = deterministic per test dir, so every call made from one test dir reaches one
 *   daemon, just as `join(testDir, '.xdg-runtime')` did. the same base `genTestTempRepo` uses
 */
export const asTestXdgRuntimeDir = (input: { of: string }): string => {
  const hash = createHash('sha256').update(input.of).digest('hex').slice(0, 12);
  return join(tmpdir(), `rhx-xdg-${hash}`);
};
