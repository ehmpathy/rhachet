import { randomBytes } from 'node:crypto';
import { lstatSync, renameSync } from 'node:fs';
import { delRoleKindDir } from './delRoleKindDir';

/**
 * .what = build a role's kind dir beside it, then rename it into place
 * .why = a reader that runs a skill while a render rebuilds the view must never meet a kind dir
 *        that is gone or half built; the new dir is whole before it takes the name, and the old
 *        one leaves by rename, so the name is absent for two renames at most
 *
 * .note = the build and prior names carry the pid and a random suffix, so no two writers share
 *   one; the repo mutex the sync holds already serializes writers, this guards the readers
 * .note = the caller asserts the kind dir holds links only before it calls; the prior dir is
 *   then cleared by `delRoleKindDir`, which never follows a link
 */
export const setRoleKindDirSwapped = (input: {
  kindDir: string;
  build: (input: { dir: string }) => void;
}): void => {
  const suffix = `${process.pid}.${randomBytes(4).toString('hex')}`;
  const dirNext = `${input.kindDir}.next.${suffix}`;
  const dirPrior = `${input.kindDir}.prior.${suffix}`;

  // build the new kind dir whole, under its own name; a build that fails leaves no trace
  try {
    input.build({ dir: dirNext });
  } catch (error) {
    delRoleKindDir({ kindDir: dirNext });
    throw error;
  }

  // move the prior kind dir aside, then the new one into place (a build may make none, for a
  //   kind with no source), then clear the prior
  const hasPrior = !!lstatSync(input.kindDir, { throwIfNoEntry: false });
  const hasNext = !!lstatSync(dirNext, { throwIfNoEntry: false });
  if (hasPrior) renameSync(input.kindDir, dirPrior);
  if (hasNext) renameSync(dirNext, input.kindDir);
  if (hasPrior) delRoleKindDir({ kindDir: dirPrior });
};
