import { z } from 'zod';

/**
 * .what = zod schema for KeyrackKeyRecipient
 * .why = validates recipient entries in manifest
 */
export const schemaKeyrackKeyRecipient = z.object({
  mech: z.enum(['ssh', 'age', 'yubikey', 'passkey']),
  pubkey: z.string(),
  label: z.string(),
  addedAt: z.string(),
});

/**
 * .what = zod schema for KeyrackKeyHost
 * .why = validates host entries from json file
 *
 * .note = env, org, vaultRecipient, maxDuration are optional for backwards compat
 */
export const schemaKeyrackKeyHost = z.object({
  slug: z.string(),
  exid: z.string().nullable(),
  vault: z.enum([
    'os.envvar',
    'os.direct',
    'os.secure',
    'os.daemon',
    '1password',
    'aws.iam.sso',
  ]),
  mech: z.enum([
    // current mechanism names
    'PERMANENT_VIA_REPLICA',
    'EPHEMERAL_VIA_GITHUB_APP',
    'EPHEMERAL_VIA_AWS_SSO',
    'EPHEMERAL_VIA_GITHUB_OIDC',
    // deprecated aliases (backwards compat)
    'REPLICA',
    'GITHUB_APP',
    'AWS_SSO',
  ]),
  env: z
    .enum(['all', 'sudo', 'prod', 'prep', 'test', 'dev', 'local'])
    .or(z.string().regex(/^[a-z][a-z0-9_-]*$/)) // custom env names allowed
    .optional()
    .default('all'),
  org: z
    .string()
    .refine((val) => val === '@all' || /^[a-z][a-z0-9_-]*$/.test(val), {
      message: 'org must be @all or a valid org name (lowercase alphanumeric)',
    })
    .optional()
    .default('unknown'),
  vaultRecipient: z.string().nullable().optional().default(null),
  maxDuration: z.string().nullable().optional().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * .what = zod schema for KeyrackHostManifest
 * .why = validates manifest from ~/.rhachet/keyrack/keyrack.host.age
 *
 * .note = owner, recipients are optional for backwards compat
 */
export const schemaKeyrackHostManifest = z.object({
  uri: z.string(),
  owner: z.string().nullable().optional().default(null),
  recipients: z.array(schemaKeyrackKeyRecipient).optional().default([]),
  hosts: z.record(z.string(), schemaKeyrackKeyHost),
});

export type SchemaKeyrackHostManifest = z.infer<
  typeof schemaKeyrackHostManifest
>;
