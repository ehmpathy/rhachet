import { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';
import { withAbsentAsNull } from '@src/infra/withAbsentAsNull';

import { join } from 'node:path';
import { getActorOndiskDir } from './getActorOndiskDir';
import { getActorOndiskManifest } from './getActorOndiskManifest';

/**
 * .what = read ONE actor by its exid — O(1) via the dir the exid names, or null when
 *   no such actor is on disk
 * .why =
 *   - a caller that already holds a clone's `actor.exid` (a `get`/`say` that just
 *     resolved a clone) needs only THAT actor's record — its brain, to re-link a
 *     transcript. the enumerate-then-find path walks + parses EVERY actor's manifest
 *     to return one; the exid names its dir directly, so this is a single stat + read
 *   - composes the canonical `getActorOndiskDir` builder + the shared
 *     `getActorOndiskManifest` reader, so the dir shape + the tolerant-read policy stay
 *     single-owned with the enumerate path (no drift)
 *
 * .note = null when the actor dir or its actor.json is absent (a benign "no such
 *   actor / half-built dir"); a CORRUPT or too-new manifest fails loud inside
 *   getActorOndiskManifest, never a silent null
 */
export const getOneActorOndiskByExid = (input: {
  repoPath: string;
  exid: string;
}): ActorOndisk | null => {
  const repoPath = getOneRepoPath({ from: input.repoPath });
  const actorDir = getActorOndiskDir({ repoPath, exid: input.exid });
  const manifestPath = join(actorDir, 'actor.json');

  // an absent dir or manifest is "no such actor here" — a benign null. one read, never a
  //   probe then a read
  const manifest = withAbsentAsNull({
    read: () => getActorOndiskManifest({ manifestPath, exid: input.exid }),
  });
  if (!manifest) return null;
  return new ActorOndisk({
    repoPath,
    exid: input.exid,
    brain: manifest.brain,
    roles: manifest.roles,
  });
};
