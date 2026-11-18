import { getAllCloneBootSpawnedRefs } from '@src/domain.operations/clone/getAllCloneBootSpawnedRefs';

import { existsSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { getActorBootRevisionDir } from './getActorBootRevisionDir';
import { setActorBootDrift } from './setActorBootDrift';

/**
 * .what = re-write the drift of every boot revision an actor holds, against its current boot
 * .why = a boot render changes what every live clone of the actor should hold; each clone
 *        refers to the revision it spawned on, so one write per revision reaches them all
 *
 * .note = a fault on one revision is collected, never thrown: the rest are still written, and
 *         the caller names each fault (a clone on a faulted revision keeps its prior drift)
 * .note = an actor with no `boots/` dir has no clone to reach; the sweep is a no-op
 */
export const setActorBootDrifts = (input: {
  actorDir: string;
  bootMdPathCurrent: string;
}): {
  revisions: number;
  rewritten: number;
  clones: number;
  faults: { revisionDir: string; reason: string; cause: Error }[];
} => {
  // enumerate the revisions; none means no clone has spawned on a revision yet
  const bootsDir = getActorBootRevisionDir({
    actorDir: input.actorDir,
    hash: null,
  });
  if (!existsSync(bootsDir))
    return { revisions: 0, rewritten: 0, clones: 0, faults: [] };
  const revisionDirs = readdirSync(bootsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('sha256='))
    .map((entry) => join(bootsDir, entry.name))
    .sort();

  // write each; collect a fault rather than stop the sweep
  const results = revisionDirs.map((revisionDir) => {
    try {
      return {
        revisionDir,
        outcome: setActorBootDrift({
          revisionDir,
          bootMdPathCurrent: input.bootMdPathCurrent,
        }).outcome,
        cause: null,
      };
    } catch (error) {
      return {
        revisionDir,
        outcome: 'fault' as const,
        cause: error instanceof Error ? error : new Error(String(error)),
      };
    }
  });

  // the clones that refer to a re-written revision: a live one takes the new drift at its next
  //   compaction
  const revisionsRewritten = new Set(
    results
      .filter((result) => result.outcome === 'rewritten')
      .map((result) => basename(result.revisionDir).replace('sha256=', '')),
  );
  //   an unreadable ref is a fault of the sweep, never a throw past the drifts it already wrote
  const refs = ((): { hashes: string[]; cause: Error | null } => {
    try {
      return {
        hashes: getAllCloneBootSpawnedRefs({ actorDir: input.actorDir }),
        cause: null,
      };
    } catch (error) {
      return {
        hashes: [],
        cause: error instanceof Error ? error : new Error(String(error)),
      };
    }
  })();
  const clonesReached = refs.hashes.filter((ref) =>
    revisionsRewritten.has(ref),
  ).length;

  // a ref that names a revision no longer on disk: its clone cannot take any drift
  const revisionNames = new Set(revisionDirs.map((dir) => basename(dir)));
  const refsGone = [...new Set(refs.hashes)].filter(
    (hash) => !revisionNames.has(`sha256=${hash}`),
  );

  return {
    revisions: revisionDirs.length,
    rewritten: revisionsRewritten.size,
    clones: clonesReached,
    faults: [
      ...results.flatMap((result) =>
        result.cause === null
          ? []
          : [
              {
                revisionDir: result.revisionDir,
                reason: 'drift not written — its clones keep their prior drift',
                cause: result.cause,
              },
            ],
      ),
      ...refsGone.map((hash) => {
        const revisionDir = getActorBootRevisionDir({
          actorDir: input.actorDir,
          hash,
        });
        return {
          revisionDir,
          reason: 'is gone, yet a clone refers to it — respawn that clone',
          cause: new Error(
            `a clone refers to a boot revision that is gone: ${revisionDir}`,
          ),
        };
      }),
      ...(refs.cause === null
        ? []
        : [
            {
              revisionDir: join(input.actorDir, 'clones'),
              reason: `a spawn ref could not be read — ${refs.cause.message}`,
              cause: refs.cause,
            },
          ]),
    ],
  };
};
