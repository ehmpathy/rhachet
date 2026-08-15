import { getActorsIndexDir } from '@src/domain.operations/actor/enrolled/getActorsIndexDir';

import { readlinkSync } from 'node:fs';
import { join } from 'node:path';
import { asCloneDirName } from './asCloneDirName';

/**
 * .what = the DISPLAY slug for one clone — the global `.slugs/` index is the
 *   authority, not the clone's own identity.json
 * .why =
 *   - a clone stamps its `--as` slug into identity.json at spawn. but the slug
 *     is a GLOBAL, rebindable handle: a later same-actor enroll `--as @:<slug>`
 *     off a dead clone REBINDS the name to a fresh serial. the old clone's
 *     identity.json still says "driver", yet the index now points elsewhere
 *   - so the shown slug must reconcile against the index: a clone displays its
 *     slug ONLY while the index still points at THIS serial. an orphan (rebound
 *     away) shows no slug — never a stale name two clones both claim
 *
 * .note = null in → null out (an unnamed clone). the index absent, or pointed
 *   at a different serial → null (this clone no longer owns the name)
 */
export const getOneCloneSlugReconciled = (input: {
  actorsRoot: string;
  serial: string;
  identitySlug: string | null;
}): string | null => {
  // an unnamed clone has no slug to reconcile
  if (input.identitySlug === null) return null;

  const linkPath = join(
    getActorsIndexDir({ actorsRoot: input.actorsRoot, index: 'slugs' }),
    input.identitySlug,
  );

  // read where the global index points; an absent index → the name is unowned
  // .note = deliberate mutation — assigned once inside the try (a readlink that may
  //   throw ENOENT); bounded to this scope, never escapes this function
  let heldTarget: string;
  try {
    heldTarget = readlinkSync(linkPath);
  } catch (error) {
    // .code is realm-safe (an own property); `instanceof Error` is not, in jest
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return null;
    throw error;
  }

  // the clone owns its slug ONLY while the index still points at THIS serial
  return heldTarget.includes(asCloneDirName({ serial: input.serial }))
    ? input.identitySlug
    : null;
};
