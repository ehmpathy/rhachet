import { join } from 'node:path';

import {
  type RhachetBackgroundHandle,
  spawnPtyCliBackground,
} from './spawnPtyCliBackground';

// the compiled binary this worktree's bin/run points at (self-linked)
const RHACHET_BIN = join(__dirname, '../../../bin/run');

/**
 * .what = spawn the compiled rhachet cli through a real pty, in the background
 * .why =
 *   - the clone socket ONLY stands up when enroll runs on an interactive tty
 *     (isCloneSocketEligible = socketCapable ∧ interactive ∧ ¬noSocket). a plain
 *     spawnSync pipes stdio, so the child sees NO tty → no socket → the reach
 *     surface (say/get) cannot be proven end-to-end
 *   - so the reach clamp needs rhachet itself to run under a pty: this helper is
 *     the OUTER pty (test → rhachet), while genBrainCliPtyClone is the INNER pty
 *     (rhachet → brain). two ptys nested, the same topology a human's terminal
 *     wraps around an enrolled brain
 *   - background, because enroll blocks on the brain's lifetime; the test drives
 *     the reach verbs (say/get) from a SEPARATE process while this one stays live
 */
export const spawnRhachetCliBackground = (input: {
  /** cli args after the binary name (e.g. ['enroll', 'claude', '--as', '@:driver']) */
  args: string[];
  /** cwd for the child */
  cwd: string;
  /** env vars merged over process.env; undefined values unset an inherited var */
  env?: Record<string, string | undefined>;
}): RhachetBackgroundHandle =>
  spawnPtyCliBackground({ bin: RHACHET_BIN, ...input });
