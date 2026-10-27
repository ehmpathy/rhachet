import { getRealpathOfNearestExtant } from '@src/infra/filesystem/getRealpathOfNearestExtant';
import { isPathOutsideDir } from '@src/utils/isPathOutsideDir';

import { realpathSync } from 'node:fs';

/**
 * .what = where a brain dir really lands, when that is outside the repo; else null
 * .why = the one measurement behind every brain dir guard, so init's skip and enroll's refusal
 *   can never disagree on what counts as outside
 *
 * .note = both sides are realpaths: a repo that sits under a symlinked parent
 *   (`/home` -> `/mnt/home`) must not read every brain dir as outside
 * .note = a brain dir not yet on disk is measured at its nearest extant ancestor, since a
 *   `mkdir -p` would create it through whatever link that ancestor holds
 */
export const getOneBrainDirLandsAtOutsideRepoOrNull = (input: {
  repoPath: string;
  brainDir: string;
}): string | null => {
  const brainDirReal = getRealpathOfNearestExtant({ path: input.brainDir });
  const isOutside = isPathOutsideDir({
    path: brainDirReal,
    dir: realpathSync(input.repoPath),
  });
  return isOutside ? brainDirReal : null;
};
