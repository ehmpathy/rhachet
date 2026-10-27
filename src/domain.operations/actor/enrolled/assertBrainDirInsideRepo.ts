import { relative } from 'node:path';
import { BrainDirOutsideRepoError } from './BrainDirOutsideRepoError';
import { getOneBrainDirLandsAtOutsideRepoOrNull } from './getOneBrainDirLandsAtOutsideRepoOrNull';

/**
 * .what = refuse a write into a brain dir whose realpath lands outside the repo
 * .why = every write into a brain dir lands by name inside it, by temp + rename, which never
 *   follows a link at the name. so the dir itself is the one part that can leave the repo, and
 *   one check per dir, at each writer's entry, covers every write beneath it
 *
 * .note = the measurement is `getOneBrainDirLandsAtOutsideRepoOrNull`; its notes say what counts
 *   as outside
 * .note = a probe, then a write: a peer that repoints a link between the two can slip past.
 *   the threat is a misconfigured box, not an adversary (vision `case=_` slice 7)
 */
export const assertBrainDirInsideRepo = (input: {
  repoPath: string;
  brainDir: string;
}): void => {
  const landsAt = getOneBrainDirLandsAtOutsideRepoOrNull(input);
  if (!landsAt) return;
  throw new BrainDirOutsideRepoError('refused a write outside the repo', {
    path: relative(input.repoPath, input.brainDir) || input.brainDir,
    landsAt,
    hint: 'point that dir, or the link above it, back inside the repo, then rerun `rhx init --hooks`',
  });
};
