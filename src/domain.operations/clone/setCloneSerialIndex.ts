import { getUuid } from 'uuid-fns';

import { asActorOndiskDirName } from '@src/domain.operations/actor/enrolled/asActorOndiskDirName';
import { getActorsIndexDir } from '@src/domain.operations/actor/enrolled/getActorsIndexDir';

import { mkdirSync, renameSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { asCloneDirName } from './asCloneDirName';
import { genAtomicSymlinkClaim } from './genAtomicSymlinkClaim';

/**
 * .what = write the global `.serials/<serial>` index for one clone — a symlink
 *   from the serial to the owner clone's dir, so a reach-by-serial is O(1)
 * .why =
 *   - a serial is the clone's PRIMARY ref, unique across every actor. without an
 *     index, `getOneCloneByRef({by:'serial'})` scans every actor's clones on each
 *     `say`/`get`/`whoami` — an O(actors×clones) walk on the hot self-management
 *     path. the index turns that into one readlink, the same shape as `.slugs/`
 *   - the link TARGET names the owner clone (`actor.via.hash=<hash>/clones/
 *     serial=<serial>`), so a reader resolves serial → clone dir directly
 *
 * .note = unlike `.slugs/`, a serial NEVER collides across actors (it is a fresh
 *   uuid), so there is no cross-actor collision + no rebind: this is a plain
 *   idempotent findsert. a re-claim of the SAME serial (a self-heal / a retry) just
 *   repoints the link to the same target via an atomic swap, never a fault
 */
export const setCloneSerialIndex = (input: {
  actorsRoot: string;
  actorHash: string;
  serial: string;
}): void => {
  const serialsDir = getActorsIndexDir({
    actorsRoot: input.actorsRoot,
    index: 'serials',
  });
  mkdirSync(serialsDir, { recursive: true });

  const linkPath = join(serialsDir, input.serial);
  const target = join(
    '..',
    asActorOndiskDirName({ hash: input.actorHash }),
    'clones',
    asCloneDirName({ serial: input.serial }),
  );

  // the atomic exclusive create — the first writer wins outright (the ONE shared
  // election primitive, same as `.slugs/`/`.exids/`)
  if (genAtomicSymlinkClaim({ linkPath, target })) return;

  // already indexed (a self-heal / a retry of the SAME clone) — repoint via an
  // atomic swap (create at a uuid-unique temp, then rename OVER). a serial is
  // globally unique, so the holder is ALWAYS this same clone; the swap keeps a
  // concurrent retry off a raw unlink/re-link gap
  const tmpLink = `${linkPath}.reindex.${getUuid()}`;
  symlinkSync(target, tmpLink);
  renameSync(tmpLink, linkPath);
};
