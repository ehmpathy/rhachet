import { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';
import { withAbsentAsNull } from '@src/infra/withAbsentAsNull';

import { type Dirent, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { asActorOndiskExidFromDirName } from './asActorOndiskExidFromDirName';
import { asActorsInStableOrder } from './asActorsInStableOrder';
import { getActorOndiskManifest } from './getActorOndiskManifest';
import { getActorsRootDir } from './getActorsRootDir';

/**
 * .what = read every actor recorded on disk for a repo — the repo actor and every hash
 *   actor alike
 * .why =
 *   - `rhx actor list`, `rhx clone list` and prune need the identities on disk; this is
 *     the read behind them
 *   - each `actor.via.<exid>` dir is one actor, reconstructed from its actor.json
 *     manifest (repoPath + exid come from the dir location). the repo actor is just an
 *     actor — one enumerate, no special case
 *
 * .note = tolerant read, so one bad actor never hides the rest:
 *   - the actors root absent entirely => none enrolled yet => []
 *   - a dir with NO actor.json => skipped (a half-built or non-actor dir — e.g. a repo
 *     actor dir that init rendered before any enroll)
 *   - a manifest that cannot be parsed => fail loud (a real corruption)
 *   - a manifest whose schemaVersion is NEWER than we know => fail loud with an
 *     upgrade hint (never a silent misread); older/absent => accepted as-is
 * .note = sorted by exid low→high, so the list order is stable across reads
 */
export const getAllActorsOndisk = (input: {
  repoPath: string;
}): ActorOndisk[] => {
  const repoPath = getOneRepoPath({ from: input.repoPath });
  const actorsRoot = getActorsRootDir({ repoPath });

  // no actors root => none enrolled yet. one read, never a probe then a read
  const entries = withAbsentAsNull({
    read: () => readdirSync(actorsRoot, { withFileTypes: true }),
  });
  if (!entries) return [];

  // read each actor dir; a non-actor dir or one with no manifest yields none
  const actors = entries.flatMap((entry) =>
    getOneActorOndiskFromDirOrNone({ entry, actorsRoot, repoPath }),
  );

  // stable order: exid low→high
  return asActorsInStableOrder({ actors });
};

/**
 * .what = read one `.agent/.actors/` entry into an actor, or none
 * .why = the enumerate reads as one call per entry; the skip rules live here
 * .note = returns an array (empty or one) so the enumerate flattens without a null filter:
 *   - a non-dir entry, or a dir whose name is not an actor exid => none
 *   - a dir with no actor.json is not yet a readable actor => none
 */
const getOneActorOndiskFromDirOrNone = (input: {
  entry: Dirent;
  actorsRoot: string;
  repoPath: string;
}): ActorOndisk[] => {
  if (!input.entry.isDirectory()) return [];

  // parse the exid out of the dir-name token; a non-actor dir yields null
  const exid = asActorOndiskExidFromDirName({ dirName: input.entry.name });
  if (exid === null) return [];

  // a dir with no manifest is not yet a readable actor — skip it
  const manifestPath = join(input.actorsRoot, input.entry.name, 'actor.json');
  const manifest = withAbsentAsNull({
    read: () => getActorOndiskManifest({ manifestPath, exid }),
  });
  if (!manifest) return [];
  return [
    new ActorOndisk({
      repoPath: input.repoPath,
      exid,
      brain: manifest.brain,
      roles: manifest.roles,
    }),
  ];
};
