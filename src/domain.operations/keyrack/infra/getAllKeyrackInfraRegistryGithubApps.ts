import { asKeyrackInfraRegistryGithubApps } from './asKeyrackInfraRegistryGithubApps';
import { KEYRACK_INFRA_REGISTRY_PATH } from './constants';
import { getKeyrackInfraRepoSlug } from './getKeyrackInfraRepoSlug';
import { getGhFileContent } from './gh/getGhFileContent';
import type { GhRun } from './gh/runGh';
import type { KeyrackInfraRegistryGithubApp } from './KeyrackInfraRegistryGithubApp';

/**
 * .what = read all registered github-apps from an org's keyrack-infra registry
 * .why = the admin-free discovery path reads apps from here instead of the
 *        org-owner-gated /orgs/{org}/installations endpoint
 *
 * .note = returns [] when the registry file is absent (repo exists, not yet seeded)
 */
export const getAllKeyrackInfraRegistryGithubApps = (
  input: { org: string },
  context: { ghRun: GhRun },
): KeyrackInfraRegistryGithubApp[] => {
  const repo = getKeyrackInfraRepoSlug({ org: input.org });
  const file = getGhFileContent(
    { repo, path: KEYRACK_INFRA_REGISTRY_PATH },
    context,
  );

  // absent registry file → no apps registered yet
  if (!file) return [];

  return asKeyrackInfraRegistryGithubApps({ content: file.content });
};
