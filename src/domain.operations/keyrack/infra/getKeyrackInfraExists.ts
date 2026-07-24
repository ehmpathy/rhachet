import { getKeyrackInfraRepoSlug } from './getKeyrackInfraRepoSlug';
import { getGhRepoExists } from './gh/getGhRepoExists';
import type { GhRun } from './gh/runGh';

/**
 * .what = check whether an org's keyrack-infra repo exists and is reachable
 * .why = github-app installs require keyrack-infra to exist first (mandatory)
 */
export const getKeyrackInfraExists = (
  input: { org: string },
  context: { ghRun: GhRun },
): boolean =>
  getGhRepoExists(
    { slug: getKeyrackInfraRepoSlug({ org: input.org }) },
    context,
  );
