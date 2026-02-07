import { z } from 'zod';

/**
 * .what = zod schema for KeyrackKeyHost
 * .why = validates host entries from json file
 */
export const schemaKeyrackKeyHost = z.object({
  slug: z.string(),
  exid: z.string().nullable(),
  vault: z.enum(['os.direct', 'os.secure', '1password']),
  mech: z.enum(['REPLICA', 'GITHUB_APP', 'AWS_SSO']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * .what = zod schema for KeyrackHostManifest
 * .why = validates manifest from ~/.rhachet/keyrack.manifest.json
 */
export const schemaKeyrackHostManifest = z.object({
  uri: z.string(),
  hosts: z.record(z.string(), schemaKeyrackKeyHost),
});

export type SchemaKeyrackHostManifest = z.infer<
  typeof schemaKeyrackHostManifest
>;
