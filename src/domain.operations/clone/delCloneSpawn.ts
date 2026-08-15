import { delFileSync } from '@src/infra/filesystem/delFileSync';

import { rmSync } from 'node:fs';

/**
 * .what = reap one clone's live spawn — kill the child, close+unlink its socket,
 *   and remove its on-disk dir
 * .why =
 *   - a concurrent bake for one slug spawns before it claims the `.slugs/` index.
 *     the loser of that claim holds a live child + a socket + a dir it must NOT
 *     leave behind — this is its whole teardown, so the winner's clone is the only
 *     survivor and `clone list` never shows a ghost row
 *   - one owner of the reap sequence means the dream's `del`/`wake` teardown reuses
 *     it rather than a re-derived kill+unlink+rm order
 *
 * .note = idempotent: the socket unlink is ENOENT-safe (the spawn's own dispose
 *   already unlinked it), and rmSync force never throws on an absent dir — so a
 *   double reap is a benign no-op
 * .note = `socketPath` is null for a plain-spawn clone (no socket ever bound), so
 *   the caller passes the real path or null — never a synthesized placeholder
 */
export const delCloneSpawn = async (input: {
  spawn: { dispose: () => Promise<void> };
  socketPath: string | null;
  dir: string;
}): Promise<void> => {
  // kill the child + close its socket server (the handle owns that lifecycle)
  await input.spawn.dispose();

  // ensure the socket file is gone even if dispose raced (ENOENT-safe). a plain
  // spawn bound no socket, so there is no path to unlink
  if (input.socketPath !== null) delFileSync({ path: input.socketPath });

  // remove the loser's clone dir, so no enumerable ghost row survives
  rmSync(input.dir, { recursive: true, force: true });
};
