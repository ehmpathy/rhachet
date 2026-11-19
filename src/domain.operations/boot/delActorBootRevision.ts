import { renameSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { isNativeError } from 'node:util/types';
import { getActorBootRevisionDir } from './getActorBootRevisionDir';

/**
 * .what = remove one boot revision dir of an actor, its boot and its drift
 * .why = `rhx clone prune` reaps a revision no clone refers to; the layout stays owned here
 * .note = whole or naught: the dir is first renamed aside, one atomic step, then removed. a
 *         bare recursive remove deletes the `boot.md` before it fails on the dir, and a dir with
 *         no `boot.md` is no revision, so a later prune would never see it again. a refused
 *         rename leaves the revision whole, and the re-run the prune hint names reaps it
 * .note = idempotent: an absent dir is success, so a second prune is a no-op; a dir set aside by
 *         a prior run that died before its remove is cleared on the next reap of that hash
 */
export const delActorBootRevision = (input: {
  actorDir: string;
  hash: string;
}): void => {
  // the revision, and the name it is set aside under: hidden, so no reader takes it for one
  const revisionDir = getActorBootRevisionDir(input);
  const asideDir = join(dirname(revisionDir), `.reap.${basename(revisionDir)}`);

  // clear a dir a prior reap set aside and did not finish
  rmSync(asideDir, { recursive: true, force: true });

  // set the revision aside in one step; an absent revision is already reaped
  try {
    renameSync(revisionDir, asideDir);
  } catch (error) {
    if (isNativeError(error) && 'code' in error && error.code === 'ENOENT')
      return;
    throw error;
  }

  // remove it; no reader takes a hidden dir for a revision, so a fault here strands no clone
  rmSync(asideDir, { recursive: true, force: true });
};
