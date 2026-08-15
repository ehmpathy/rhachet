import { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getActorOndiskDir } from './getActorOndiskDir';
import { getActorOndiskManifest } from './getActorOndiskManifest';

/**
 * .what = read ONE enrolled actor by its hash — O(1) via the dir the hash names,
 *   or null when no such actor is on disk
 * .why =
 *   - a caller that already holds a clone's `actor.hash` (a `get`/`say` that just
 *     resolved a clone) needs only THAT actor's record — its brain, to re-link a
 *     transcript. the enumerate-then-find path (`getAllActorsOndisk(...).find`)
 *     walks + parses EVERY actor's manifest to return one, an O(actors) scan on a
 *     hot reach path. the hash names its dir directly, so this is a single
 *     stat + read
 *   - composes the canonical `getActorOndiskDir` builder + the shared
 *     `getActorOndiskManifest` reader, so the dir shape + the tolerant-read
 *     policy stay single-owned with the enumerate path (no drift)
 *
 * .note = null when the actor dir or its actor.json is absent (a benign "no such
 *   actor / half-built dir"); a CORRUPT or too-new manifest fails loud inside
 *   getActorOndiskManifest, never a silent null
 */
export const getOneActorOndiskByHash = (input: {
  repoPath: string;
  hash: string;
}): ActorOndisk | null => {
  const repoPath = getOneRepoPath({ from: input.repoPath });
  const actorDir = getActorOndiskDir({ repoPath, hash: input.hash });
  const manifestPath = join(actorDir, 'actor.json');

  // an absent dir or manifest is "no such actor here" — a benign null
  if (!existsSync(manifestPath)) return null;

  const manifest = getActorOndiskManifest({
    manifestPath,
    hash: input.hash,
  });
  return new ActorOndisk({
    repoPath,
    hash: input.hash,
    brain: manifest.brain,
    roles: manifest.roles,
  });
};
