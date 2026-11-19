import { setFileAtomic } from '@src/infra/setFileAtomic';

import { existsSync, readFileSync } from 'node:fs';
import { asBootContentHash } from './asBootContentHash';
import { getActorBootCurrentPath } from './getActorBootCurrentPath';
import { getActorBootRevisionPaths } from './getActorBootRevisionPaths';
import { setActorBootDrift } from './setActorBootDrift';

/**
 * .what = findsert the boot revision a clone spawns on: the actor's current `boot.md` bytes,
 *         kept at `<actor>/boots/sha256=<hash>/boot.md`, with its drift `CLAUDE.md` beside
 * .why = the clone's system prompt is read from the revision's own `boot.md`, so the bytes
 *        it holds are exactly the bytes the drift is computed from, whatever render lands
 *        after; every clone that spawns on the same bytes shares the one revision
 *
 * .note = the hash is cut from the very bytes it writes, so the dir name never lies
 * .note = the drift is written at once, against a fresh read of the current boot, so a render
 *         that landed between the read and the findsert is carried
 * .note = no lock spans the drift's read and its write: a render that sweeps this revision in
 *         that gap can have its drift overwritten by the older one. the reader's stale check
 *         (`getOneCloneBootDrift`) then fails loud, and the next render or `rhx init` rewrites it
 * .note = null when the actor has no rendered boot: no boot, no revision
 */
export const genActorBootRevision = (input: {
  actorDir: string;
}): { hash: string; revisionDir: string; bootMdPath: string } | null => {
  // read the actor's current boot once; the revision is cut from these bytes
  const bootMdPathCurrent = getActorBootCurrentPath({
    actorDir: input.actorDir,
  });
  if (!existsSync(bootMdPathCurrent)) return null;
  const bytes = readFileSync(bootMdPathCurrent, 'utf8');
  const hash = asBootContentHash({ bytes });

  // findsert the revision's boot; same hash, same bytes, so an extant one is kept
  const { dir: revisionDir, bootMd: bootMdPath } = getActorBootRevisionPaths({
    actorDir: input.actorDir,
    hash,
  });
  if (!existsSync(bootMdPath))
    setFileAtomic({ path: bootMdPath, content: bytes });

  // write its drift against the boot as it stands now
  setActorBootDrift({
    revisionDir,
    bootCurrent: readFileSync(bootMdPathCurrent, 'utf8'),
  });

  return { hash, revisionDir, bootMdPath };
};
