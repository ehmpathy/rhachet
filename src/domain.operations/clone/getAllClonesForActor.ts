import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { asCloneSerialFromDirName } from './asCloneSerialFromDirName';
import { asClonesInStableOrder } from './asClonesInStableOrder';
import { getOneCloneHydrated } from './getOneCloneHydrated';

/**
 * .what = enumerate every clone of ONE enrolled actor, hydrated + stably ordered
 * .why =
 *   - `clone list` groups clones under their actor; this reads the one actor's
 *     `clones/serial=*` dirs and hydrates each. an actor with no clones (or no
 *     clones dir yet) yields an empty list, never an error
 *   - the order is STABLE — spawnedAt asc, then serial asc as a deterministic
 *     tiebreak — so a `list` render never reshuffles between reads
 *
 * .note = a `serial=*` dir with no identity.json is skipped (getOneCloneHydrated
 *   returns null) — a half-built clone dir never appears as a ghost row
 */
export const getAllClonesForActor = (input: {
  actorDir: string;
  actorsRoot: string;
  repoPath: string;
  actorExid: string;
}): CloneOndisk[] => {
  const clonesDir = join(input.actorDir, 'clones');

  // read the serial dirs; an absent clones dir is an actor with no clones yet
  // .note = deliberate mutation — `entries` is assigned once inside the try (a
  //         readdir that may throw ENOENT); bounded to this scope, never escapes
  let entries: string[];
  try {
    entries = readdirSync(clonesDir);
  } catch (error) {
    // .code is realm-safe (an own property); `instanceof Error` is not, in jest
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return [];
    throw error;
  }

  // hydrate each serial dir; skip a non-serial name and a half-built clone dir
  const clones = entries.flatMap((dirName) =>
    getOneCloneHydratedFromDirOrNone({ ...input, clonesDir, dirName }),
  );

  // stable order: spawnedAt asc, then serial asc as a deterministic tiebreak
  return asClonesInStableOrder({ clones });
};

/**
 * .what = hydrate one `clones/` entry into a clone, or none
 * .why = the enumerate reads as one call per entry; the skip rules live here
 * .note = returns an array (empty or one) so the enumerate flattens without a null filter:
 *   - a name that is not `serial=*` => none
 *   - a serial dir with no identity.json (getOneCloneHydrated → null) => none
 */
const getOneCloneHydratedFromDirOrNone = (input: {
  clonesDir: string;
  dirName: string;
  actorsRoot: string;
  repoPath: string;
  actorExid: string;
}): CloneOndisk[] => {
  if (asCloneSerialFromDirName({ dirName: input.dirName }) === null) return [];
  const clone = getOneCloneHydrated({
    cloneDir: join(input.clonesDir, input.dirName),
    actorsRoot: input.actorsRoot,
    repoPath: input.repoPath,
    actorExid: input.actorExid,
  });
  return clone === null ? [] : [clone];
};
