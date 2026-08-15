import { ConstraintError } from 'helpful-errors';
import { getUuid } from 'uuid-fns';

import { asActorOndiskDirName } from '@src/domain.operations/actor/enrolled/asActorOndiskDirName';
import { getActorsIndexDir } from '@src/domain.operations/actor/enrolled/getActorsIndexDir';

import { mkdirSync, readlinkSync, renameSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { asCloneDirName } from './asCloneDirName';
import { genAtomicSymlinkClaim } from './genAtomicSymlinkClaim';

/**
 * .what = claim the global `.slugs/<slug>` index for one clone, atomically —
 *   a symlink from the slug to the owner clone's dir
 * .why =
 *   - a slug is GLOBAL (unique across every actor), so the claim is a single
 *     atomic exclusive symlink: the first writer wins, a second writer sees the
 *     link already exists. this is the concurrent-bake winner-election, done by
 *     the filesystem, not a lock we could leak
 *   - the link TARGET names the owner clone (`actor.via.hash=<hash>/clones/
 *     serial=<serial>`), so a reader resolves slug → clone, and a re-claim can
 *     tell OUR actor's stale link from a DIFFERENT actor's live one
 *
 * .note = a DIFFERENT actor already holds the slug → hard collision, fail loud
 *   (the global index is unique; the caller must pick another slug). the SAME
 *   actor that holds it (a rebind off a dead clone, a self-heal of a stale
 *   claim) → repoint the link to the new serial — idempotent by slug
 */
export const setCloneSlugIndex = (input: {
  actorsRoot: string;
  slug: string;
  actorHash: string;
  serial: string;
}): void => {
  const slugsDir = getActorsIndexDir({
    actorsRoot: input.actorsRoot,
    index: 'slugs',
  });
  mkdirSync(slugsDir, { recursive: true });

  const linkPath = join(slugsDir, input.slug);
  const target = join(
    '..',
    asActorOndiskDirName({ hash: input.actorHash }),
    'clones',
    asCloneDirName({ serial: input.serial }),
  );

  // the atomic exclusive create — the first writer of this slug wins outright.
  // routes through the ONE shared election primitive (genAtomicSymlinkClaim), the
  // same `.slugs/`/`.exids/`/quarantine claim uses — never a hand-rolled try/catch
  if (genAtomicSymlinkClaim({ linkPath, target })) return;

  // the slug is already held — read WHO holds it (the actor hash in its target)
  const heldTarget = readlinkSync(linkPath);
  const heldByThisActor = heldTarget.includes(
    `${asActorOndiskDirName({ hash: input.actorHash })}/`,
  );

  // a DIFFERENT actor holds the global-unique slug — a hard collision
  if (!heldByThisActor)
    ConstraintError.throw(
      `slug "${input.slug}" is already claimed by a different actor`,
      {
        slug: input.slug,
        heldTarget,
        hint: 'pick a different --as @:<slug>, or reach the extant clone by that slug',
      },
    );

  // OUR actor holds a stale link (a dead clone rebind / a self-heal) — repoint it
  // to the new serial via an ATOMIC SWAP: create the new link at a uuid-unique temp
  // path, then rename(2) OVER the target. POSIX rename of a symlink is atomic, so a
  // concurrent rebind never sees a vacated slot between an unlink and a re-link —
  // which is exactly the gap that would let two concurrent rebinds throw a raw
  // EEXIST or steal the slug back from each other (two live billed clones, one
  // slug). the uuid temp keeps two concurrent rebinds (and a same-serial retry) on
  // distinct temps; whichever renames last wins deterministically, neither faults
  const tmpLink = `${linkPath}.rebind.${getUuid()}`;
  symlinkSync(target, tmpLink);
  renameSync(tmpLink, linkPath);
};
