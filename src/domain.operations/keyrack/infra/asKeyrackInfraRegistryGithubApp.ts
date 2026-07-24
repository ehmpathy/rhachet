import type { KeyrackInfraRegistryGithubApp } from './KeyrackInfraRegistryGithubApp';

/**
 * .what = cast a discovered org install into a keyrack-infra registry entry
 * .why = the org install list and the registry share the same non-secret ids;
 *        this names the cast once so both discovery and registration reuse it
 */
export const asKeyrackInfraRegistryGithubApp = (input: {
  org: string;
  install: { appId: string; installationId: string; slug: string };
}): KeyrackInfraRegistryGithubApp => ({
  org: input.org,
  appId: input.install.appId,
  installationId: input.install.installationId,
  slug: input.install.slug,
});
