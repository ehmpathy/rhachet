import { relative } from 'node:path';
import { BrainDirOutsideRepoError } from './BrainDirOutsideRepoError';
import { getOneBrainDirLandsAtOutsideRepoOrNull } from './getOneBrainDirLandsAtOutsideRepoOrNull';

/**
 * .what = the brain dir guard, for `rhx enroll`: the same measurement and refusal, with a hint
 *   that names the command the human just ran
 * .why = the shared guard's hint names `rhx init --hooks`, the command that skips such a dir. an
 *   enroll refuses instead, so its human reruns the enroll, never init
 */
export const assertBrainDirInsideRepoForEnroll = (input: {
  repoPath: string;
  brainDir: string;
}): void => {
  const landsAt = getOneBrainDirLandsAtOutsideRepoOrNull(input);
  if (!landsAt) return;
  throw new BrainDirOutsideRepoError('refused a write outside the repo', {
    path: relative(input.repoPath, input.brainDir) || input.brainDir,
    landsAt,
    hint: 'point that dir, or the link above it, back inside the repo, then rerun `rhx enroll`',
  });
};
