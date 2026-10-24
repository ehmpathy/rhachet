import {
  chmodSync,
  existsSync,
  mkdirSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

/**
 * .what = writes a stub `claude` executable into a fresh bin dir and returns a
 *         PATH that finds it first
 * .why = enroll's terminal action spawns the brain CLI. to prove an enroll end-to-end
 *        without a live, interactive `claude`, we shadow `claude` with a no-op stub that
 *        exits 0. the config artifact is authored BEFORE the spawn, so a 0-exit stub lets
 *        the whole run complete deterministically and leaves the artifact to assert on.
 * .note = `--version` answers the floor by default, so enroll's version guard lets it
 *   through. pass `version` BELOW the floor to exercise the refusal at this same grain
 *
 * 🚨 .note = `shadowed` makes the PATH HERMETIC, and that is the whole point of it. the
 *   default form appends `process.env.PATH`, so any real `claude` on the host joins the
 *   scan — harmless for a case that only asserts the winner, FATAL for one that snaps the
 *   refusal, because `shadowed` then pins whichever installs that host happens to carry
 *   (`rule.require.hermetic-tests`). pass `shadowed` and the PATH holds two stubs we wrote
 *   plus `/usr/bin:/bin`, so the whole scan is deterministic on every box
 */
export const setupStubBrainPath = (input: {
  dir: string;
  version?: string;
  /** a SECOND stub `claude`, one dir BEHIND the winner, whose version the refusal reports
   *  as shadowed. its presence switches the PATH to the hermetic form described above */
  shadowed?: string;
}): string => {
  const writeStubBrain = (stub: { dir: string; version: string }): void => {
    mkdirSync(stub.dir, { recursive: true });
    const stubPath = join(stub.dir, 'claude');
    writeFileSync(
      stubPath,
      `#!/usr/bin/env bash\nif [ "$1" = "--version" ]; then echo "${stub.version} (Claude Code)"; fi\nexit 0\n`,
      'utf-8',
    );
    chmodSync(stubPath, 0o755);
  };

  const binDir = join(input.dir, '.stub-bin');
  writeStubBrain({ dir: binDir, version: input.version ?? '2.1.277' });

  // the host PATH is kept ONLY where no snapshot reads the scan (see the note above)
  if (!input.shadowed) return `${binDir}:${process.env.PATH ?? ''}`;

  const binDirShadowed = join(input.dir, '.stub-bin-shadowed');
  writeStubBrain({ dir: binDirShadowed, version: input.shadowed });

  // the built cli routes `enroll` to its jit entry, whose shebang resolves `node` on
  // PATH — so a hermetic PATH must carry one. it carries OUR node (a symlink to this
  // process's own interpreter) in a dir of its own, rather than the host dir node
  // happens to live in, because that dir is exactly where a real `claude` install sits
  const binDirNode = join(input.dir, '.stub-bin-node');
  mkdirSync(binDirNode, { recursive: true });
  const nodePath = join(binDirNode, 'node');
  if (!existsSync(nodePath)) symlinkSync(process.execPath, nodePath);

  // `/usr/bin:/bin` is the minimum the shell dispatcher needs. of the four dirs, only
  // the two stub dirs hold a `claude`, so the scan sees exactly those two, in this order
  return `${binDir}:${binDirShadowed}:${binDirNode}:/usr/bin:/bin`;
};
