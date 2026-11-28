import { renameSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { isNativeError } from 'node:util/types';
import { getActorBootSpawnedPaths } from './getActorBootSpawnedPaths';

/**
 * .what = remove one clone's spawn boot dir: its boot, its meta, and its drift
 * .why = a clone's boot lives and dies with the clone; `rhx clone prune` and a failed spawn reap
 *        it beside the clone dir, and the layout stays owned here
 * .note = whole or naught: the dir is first renamed aside, one atomic step, then removed. a bare
 *         recursive remove deletes the meta before it fails on the dir, and a dir with no meta is
 *         no spawn boot, so a later reap would never see it again
 * .note = idempotent: an absent dir is success; a dir set aside by a prior run that died before
 *         its remove is cleared on the next reap of that serial
 */
export const delActorBootSpawned = (input: {
  actorDir: string;
  serial: string;
}): void => {
  // the spawn boot, and the name it is set aside under: hidden, so no reader takes it for one
  const { dir } = getActorBootSpawnedPaths(input);
  const asideDir = join(dirname(dir), `.reap.${basename(dir)}`);

  // clear a dir a prior reap set aside and did not finish
  rmSync(asideDir, { recursive: true, force: true });

  // set the spawn boot aside in one step; an absent one is already reaped
  try {
    renameSync(dir, asideDir);
  } catch (error) {
    if (isNativeError(error) && 'code' in error && error.code === 'ENOENT')
      return;
    throw error;
  }

  // remove it; no reader takes a hidden dir for a spawn boot, so a fault here strands no clone
  rmSync(asideDir, { recursive: true, force: true });
};
