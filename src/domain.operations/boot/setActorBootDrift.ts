import { MalfunctionError } from 'helpful-errors';

import { setFileAtomic } from '@src/infra/setFileAtomic';

import { existsSync, readFileSync } from 'node:fs';
import { asBootDelta } from './asBootDelta';
import { getActorBootSpawnedPaths } from './getActorBootSpawnedPaths';
import { getOneActorBootSpawnedMeta } from './getOneActorBootSpawnedMeta';

/**
 * .what = write one clone's drift: the delta from the boot it spawned on to the actor's current
 *         boot, into the `CLAUDE.md` of its spawn boot dir
 * .why = the clone reads that `CLAUDE.md` at compaction, so it holds the actor's current boot
 *        without a respawn and without a change to its cached system prompt
 *
 * .note = the drift is cached per current boot hash: where the meta says the drift was already
 *         written against this hash, naught is read or computed, so a re-render with no change
 *         costs one meta read per clone
 * .note = an unchanged drift is not re-written, so a re-render whose delta did not move touches
 *         only the meta
 * .note = no drift writes an empty `CLAUDE.md`: the clone reads naught extra
 * .note = the current boot arrives as bytes and its hash, read once by the caller, so every clone
 *         of one sweep is written against the same boot
 */
export const setActorBootDrift = (input: {
  actorDir: string;
  serial: string;
  bootCurrent: string;
  bootCurrentHash: string;
}): { outcome: 'rewritten' | 'unchanged' } => {
  const paths = getActorBootSpawnedPaths({
    actorDir: input.actorDir,
    serial: input.serial,
  });

  // the meta names the spawn boot; a dir with none is no spawn boot to drift from
  const meta = getOneActorBootSpawnedMeta({ path: paths.metaJson });
  if (meta === null)
    throw new MalfunctionError('the spawn boot dir holds no meta', {
      path: paths.dir,
      hint: 'the clone cannot be read for drift; respawn it to take the current boot',
    });

  // the drift was already written against this boot: naught to do
  const isCached =
    meta.drift?.against === input.bootCurrentHash && existsSync(paths.driftMd);
  if (isCached) return { outcome: 'unchanged' };

  // the delta from the spawn boot to the current one
  const delta = asBootDelta({
    bootSpawned: readFileSync(paths.bootMd, 'utf8'),
    bootCurrent: input.bootCurrent,
  });
  const content = delta.markdown ?? '';

  // write the drift where it differs, then key the cache to this boot
  const contentPrior = existsSync(paths.driftMd)
    ? readFileSync(paths.driftMd, 'utf8')
    : null;
  const isChanged = contentPrior !== content;
  if (isChanged) setFileAtomic({ path: paths.driftMd, content });
  setFileAtomic({
    path: paths.metaJson,
    content: `${JSON.stringify({ ...meta, drift: { against: input.bootCurrentHash } }, null, 2)}\n`,
  });
  return { outcome: isChanged ? 'rewritten' : 'unchanged' };
};
