import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { asCloneSerialFromDirName } from './asCloneSerialFromDirName';
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
  actorHash: string;
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

  // hydrate each serial dir; skip a half-built one (no identity.json → null)
  const clones = entries
    .filter((name) => asCloneSerialFromDirName({ dirName: name }) !== null)
    .map((name) =>
      getOneCloneHydrated({
        cloneDir: join(clonesDir, name),
        actorsRoot: input.actorsRoot,
        repoPath: input.repoPath,
        actorHash: input.actorHash,
      }),
    )
    .filter((clone): clone is NonNullable<typeof clone> => clone !== null);

  // stable order: spawnedAt asc, then serial asc as a deterministic tiebreak
  // (spread-copy so the sort never mutates the array in place)
  return [...clones].sort((a, b) => {
    if (a.spawnedAt !== b.spawnedAt) return a.spawnedAt < b.spawnedAt ? -1 : 1;
    return a.serial < b.serial ? -1 : a.serial > b.serial ? 1 : 0;
  });
};
