import { z } from 'zod';

/**
 * .what = zod schema for a keyrack-infra github-app registry entry
 * .why = validates entries read from $org/keyrack-infra/registry/github-apps.json
 *
 * .note = all fields are non-secret identifiers; the pem never lives here
 */
export const schemaKeyrackInfraRegistryGithubApp = z.object({
  org: z.string(),
  appId: z.string(),
  installationId: z.string(),
  slug: z.string(),
});

/**
 * .what = a single github-app registry entry
 */
export type KeyrackInfraRegistryGithubApp = z.infer<
  typeof schemaKeyrackInfraRegistryGithubApp
>;

/**
 * .what = zod schema for the full registry file (an array of app entries)
 * .why = validates the shape of registry/github-apps.json
 */
export const schemaKeyrackInfraRegistry = z.array(
  schemaKeyrackInfraRegistryGithubApp,
);
