import { rmSync } from 'node:fs';

/**
 * .what = drop the staged clone dir, whether or not it is still there
 *
 * .why = the enroll stages a clone dir BEFORE it spawns a brain, so every path that fails
 *   past that point owes a reap — else a failed enroll leaves a half-built clone on disk
 *   that `getAllClonesForActor` will later read as real.
 *
 * .note = IDEMPOTENT — `force` swallows ENOENT, so every failure path may call it
 *   unconditionally rather than first prove the dir is still there
 *   (`rule.require.idempotent-operations`)
 */
export const delCloneStagedDir = (input: { cloneDir: string }): void =>
  rmSync(input.cloneDir, { recursive: true, force: true });
