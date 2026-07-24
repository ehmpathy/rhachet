import { asKeyrackInfraRegistryGithubApp } from './asKeyrackInfraRegistryGithubApp';
import type { KeyrackInfraRegistryGithubApp } from './KeyrackInfraRegistryGithubApp';

/**
 * .what = cast a list of discovered org installs into keyrack-infra registry entries
 * .why = names the install-list → registry-entry cast once, so the discovery
 *        orchestrator reads as narrative instead of an inline .map cast
 */
export const getAllKeyrackInfraRegistryGithubAppsFromInstalls = (input: {
  org: string;
  installs: { appId: string; installationId: string; slug: string }[];
}): KeyrackInfraRegistryGithubApp[] =>
  input.installs.map((install) =>
    asKeyrackInfraRegistryGithubApp({ org: input.org, install }),
  );
