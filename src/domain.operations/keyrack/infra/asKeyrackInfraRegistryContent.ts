import type { KeyrackInfraRegistryGithubApp } from './KeyrackInfraRegistryGithubApp';

/**
 * .what = cast registry entries into the canonical registry file content
 * .why = the registry file has one canonical serialized form (2-space json that
 *        ends in a newline); this names it once so every writer stays byte-consistent
 *
 * .note = inverse of asKeyrackInfraRegistryGithubApps (content → apps)
 */
export const asKeyrackInfraRegistryContent = (input: {
  apps: KeyrackInfraRegistryGithubApp[];
}): string => `${JSON.stringify(input.apps, null, 2)}\n`;
