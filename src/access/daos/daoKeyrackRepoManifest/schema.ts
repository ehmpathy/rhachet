import { z } from 'zod';

/**
 * .what = zod schema for KeyrackKeySpec as stored in yaml
 * .why = validates key specs from yaml manifest
 *
 * .note = slug is omitted because it comes from the map key
 */
export const schemaKeyrackKeySpecYaml = z.object({
  mech: z.enum(['REPLICA', 'GITHUB_APP', 'AWS_SSO']),
});

/**
 * .what = zod schema for KeyrackRepoManifest
 * .why = validates manifest from @gitroot/.agent/keyrack.yml
 */
export const schemaKeyrackRepoManifest = z.object({
  keys: z.record(z.string(), schemaKeyrackKeySpecYaml),
});

export type SchemaKeyrackRepoManifest = z.infer<
  typeof schemaKeyrackRepoManifest
>;
