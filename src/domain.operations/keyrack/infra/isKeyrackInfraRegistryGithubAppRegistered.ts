import type { KeyrackInfraRegistryGithubApp } from './KeyrackInfraRegistryGithubApp';

/**
 * .what = decide whether an app slug is already present in a registry list
 * .why = keeps the findsert skip-check in genKeyrackInfraRegistryGithubApp a pure, named leaf
 *
 * .note = identity is by slug — the registry's natural key for a github app
 */
export const isKeyrackInfraRegistryGithubAppRegistered = (input: {
  apps: KeyrackInfraRegistryGithubApp[];
  slug: string;
}): boolean => input.apps.some((app) => app.slug === input.slug);
