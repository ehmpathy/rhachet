import { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { asActorOndiskHashFromDirName } from './asActorOndiskHashFromDirName';
import { getActorOndiskManifest } from './getActorOndiskManifest';
import { getActorsRootDir } from './getActorsRootDir';

/**
 * .what = read every enrolled (anonymous) actor recorded on disk for a repo
 * .why =
 *   - `rhx actor list` needs the identities on disk; this is the read behind it
 *   - the hash namespace is enroll's whole domain, so this filters to
 *     `actor.via.hash=*` dirs and reconstructs each ActorOndisk from its
 *     actor.json manifest (repoPath + hash come from the dir location)
 *
 * .note = tolerant read, so one bad actor never hides the rest:
 *   - the actors root absent entirely => none enrolled yet => []
 *   - a dir with NO actor.json => skipped (a half-built or non-actor dir)
 *   - a manifest that cannot be parsed => fail loud (a real corruption)
 *   - a manifest whose schemaVersion is NEWER than we know => fail loud with an
 *     upgrade hint (never a silent misread); older/absent => accepted as-is
 * .note = sorted by hash low→high, so the list order is stable across reads
 */
export const getAllActorsOndisk = (input: {
  repoPath: string;
}): ActorOndisk[] => {
  const repoPath = getOneRepoPath({ from: input.repoPath });
  const actorsRoot = getActorsRootDir({ repoPath });

  // no actors root => none enrolled yet
  if (!existsSync(actorsRoot)) return [];

  const actors = readdirSync(actorsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      // parse the hash out of the dir-name token; a non-actor dir yields null
      const hash = asActorOndiskHashFromDirName({ dirName: entry.name });
      if (hash === null) return null;

      const manifestPath = join(actorsRoot, entry.name, 'actor.json');

      // a dir with no manifest is not yet a readable actor — skip it
      if (!existsSync(manifestPath)) return null;

      const manifest = getActorOndiskManifest({ manifestPath, hash });
      return new ActorOndisk({
        repoPath,
        hash,
        brain: manifest.brain,
        roles: manifest.roles,
      });
    })
    .filter((actor): actor is ActorOndisk => actor !== null);

  // stable order: hash low→high
  // (spread-copy so the sort never mutates the array in place)
  return [...actors].sort((a, b) =>
    a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0,
  );
};
