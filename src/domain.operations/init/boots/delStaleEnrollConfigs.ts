import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneActorOndiskByExid } from '@src/domain.operations/actor/enrolled/getOneActorOndiskByExid';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';
import { getOneIsActorActive } from '@src/domain.operations/clone/getOneIsActorActive';
import { withAbsentAsNull } from '@src/infra/withAbsentAsNull';

import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { asEnrollConfigHashOrNull } from './asEnrollConfigHashOrNull';

/**
 * .what = remove each retired `settings.enroll.<hash>.local.json` from the repo actor's
 *         brain dir, once the hash actor it served has no clone left that is not DEAD
 * .why = enroll now writes each actor's `settings.of.repo.json` in its own brain dir; the old
 *        per-enroll file is dead weight. a clone spawned before the change still names
 *        its old file in `--settings` and re-reads it, so a file whose actor is still
 *        active stays until the next sync that finds it idle
 *
 * .note = an actor with no record on disk (no dir, or no `actor.json`) has no clone, so its
 *   file goes; a record that is there is read whole, never assembled from placeholders
 * .note = enroll passes the actor's own `settings.of.repo.json` in `--settings`
 *   (`asBrainCliSpawnArgs`), so a retired file's readers are clones spawned before the change,
 *   and the probe keeps those. in `src/`, `rg 'settings\.enroll'` names only this operation,
 *   its name parser `asEnrollConfigHashOrNull`, and their tests
 */
export const delStaleEnrollConfigs = async (input: {
  repoPath: string;
}): Promise<{ deleted: string[]; kept: string[] }> => {
  const brainDir = getBrainOndiskDir({
    actorDir: getOneRepoActorOndiskDir({ repoPath: input.repoPath }),
  });
  // one read, never a probe then a read: a dir a peer removes between the two would throw a
  //   raw ENOENT where the probe meant to report an absence
  const names = withAbsentAsNull({ read: () => readdirSync(brainDir) });
  if (names === null) return { deleted: [], kept: [] };

  // .note = deliberate mutation — two tallies of this sweep, scoped to it, never escape
  const deleted: string[] = [];
  const kept: string[] = [];
  for (const name of names) {
    const hash = asEnrollConfigHashOrNull({ name });
    if (!hash) continue;
    const actor = getOneActorOndiskByExid({
      repoPath: input.repoPath,
      exid: `hash=${hash}`,
    });
    if (actor && (await getOneIsActorActive({ actor }))) {
      kept.push(name);
      continue;
    }
    rmSync(join(brainDir, name), { force: true });
    deleted.push(name);
  }
  return { deleted, kept };
};
