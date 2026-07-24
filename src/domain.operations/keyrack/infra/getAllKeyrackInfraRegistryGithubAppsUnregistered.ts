import { isKeyrackInfraRegistryGithubAppRegistered } from './isKeyrackInfraRegistryGithubAppRegistered';
import type { KeyrackInfraRegistryGithubApp } from './KeyrackInfraRegistryGithubApp';

/**
 * .what = pick the org installs that are not yet in the registry
 * .why = an admin discovers newly-installed apps to register; apps already in the
 *        registry are excluded so the merged candidate list carries no duplicates
 *
 * .note = dedup is by app slug (the registry's identity for an app)
 */
export const getAllKeyrackInfraRegistryGithubAppsUnregistered = (input: {
  registryApps: KeyrackInfraRegistryGithubApp[];
  installApps: KeyrackInfraRegistryGithubApp[];
}): KeyrackInfraRegistryGithubApp[] =>
  input.installApps.filter(
    (app) =>
      !isKeyrackInfraRegistryGithubAppRegistered({
        apps: input.registryApps,
        slug: app.slug,
      }),
  );
