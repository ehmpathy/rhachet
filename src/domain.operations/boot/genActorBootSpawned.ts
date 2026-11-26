import { setFileAtomic } from '@src/infra/setFileAtomic';

import { existsSync, readFileSync } from 'node:fs';
import { asBootContentHash } from './asBootContentHash';
import { getActorBootCurrentPath } from './getActorBootCurrentPath';
import { getActorBootSpawnedPaths } from './getActorBootSpawnedPaths';
import { setActorBootDrift } from './setActorBootDrift';

/**
 * .what = write the boot one clone spawns on: the actor's current `boot.md` bytes, kept at
 *         `<actor>/boots/serial=<serial>/boot.md`, with its meta and its drift `CLAUDE.md` beside
 * .why = the clone's system prompt is read from this `boot.md`, so the bytes it holds are exactly
 *        the bytes its drift is computed from, whatever render lands after
 *
 * .note = the boot is the clone's own, the bytes of its spawn instant, so it lives and is reaped
 *         with that clone, keyed by its serial; no other clone reads it
 * .note = the meta is written after the boot, so a dir with a meta always holds its boot; the
 *         sweep lists only dirs that hold a meta
 * .note = the drift is written at once, against a fresh read of the current boot, so a render
 *         that landed between the read and the write is carried
 * .note = null when the actor has no rendered boot: no boot, no spawn boot
 */
export const genActorBootSpawned = (input: {
  actorDir: string;
  serial: string;
}): { hash: string; dir: string; bootMdPath: string } | null => {
  // read the actor's current boot once; the spawn boot is cut from these bytes
  const bootMdPathCurrent = getActorBootCurrentPath({
    actorDir: input.actorDir,
  });
  if (!existsSync(bootMdPathCurrent)) return null;
  const bytes = readFileSync(bootMdPathCurrent, 'utf8');
  const hash = asBootContentHash({ bytes });

  // the boot, then the meta that names it
  const paths = getActorBootSpawnedPaths({
    actorDir: input.actorDir,
    serial: input.serial,
  });
  setFileAtomic({ path: paths.bootMd, content: bytes });
  setFileAtomic({
    path: paths.metaJson,
    content: `${JSON.stringify({ spawned: { hash }, drift: null }, null, 2)}\n`,
  });

  // its drift against the boot as it stands now
  const bootCurrent = readFileSync(bootMdPathCurrent, 'utf8');
  setActorBootDrift({
    actorDir: input.actorDir,
    serial: input.serial,
    bootCurrent,
    bootCurrentHash: asBootContentHash({ bytes: bootCurrent }),
  });

  return { hash, dir: paths.dir, bootMdPath: paths.bootMd };
};
