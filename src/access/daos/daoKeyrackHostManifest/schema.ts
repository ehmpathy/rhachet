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
 * .what = zod schema for KeyrackKeyReach
 * .why = validates the reach a key was cut for
 *
 * .note = a reach is PLAINTEXT — the manifest stores the exid a human wrote and no more.
 *         keyrack does not interpret it here, so there is no scheme list to keep in
 *         step and no shape to migrate when a new kind of reach shows up
 * .note = the only rule is the one `asKeyrackKeyReach` enforces at the boundary: non-empty
 *         and free of whitespace, so a key address stays readable to a human
 * .note = the preprocess reads a manifest written BEFORE the label→exid rename. the host
 *         manifest is encrypted on disk and cannot be regenerated from anywhere, so a
 *         strict `exid`-only schema would reject a real human's rack outright — a fail
 *         that names no fix, since the file is opaque to them. the read accepts both
 *         spellings; the write emits only `exid`, because the dobj carries only `exid`.
 *         so a manifest converts the first time keyrack rewrites it, and never after
 */
export const schemaKeyrackKeyReach = z.preprocess(
  (raw) => {
    // a pre-rename manifest spells it `label`; read that as the exid it always was
    if (raw && typeof raw === 'object' && 'label' in raw && !('exid' in raw))
      return { exid: (raw as { label: unknown }).label };
    return raw;
  },
  z.object({ exid: z.string().min(1).regex(/^\S+$/) }),
);

/**
 * .what = zod schema for KeyrackKeyHost
 * .why = validates host entries from json file
 *
 * .note = env, org, meta, maxDuration are optional for backwards compat
 * .note = reach is optional with NO default — an absent reach must stay absent, because
 *         a defaulted null would re-serialize every extant manifest differently (e16)
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
    'aws.config',
    'aws.params',
    'github.secrets',
  ]),
  mech: z.enum([
    'PERMANENT_VIA_REPLICA',
    'PERMANENT_VIA_REFERENCE',
    'EPHEMERAL_VIA_SESSION',
    'EPHEMERAL_VIA_GITHUB_APP',
    'EPHEMERAL_VIA_AWS_SSO',
    'EPHEMERAL_VIA_GITHUB_OIDC',
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
  reach: schemaKeyrackKeyReach.optional(),
  meta: z.record(z.string(), z.unknown()).nullable().optional().default(null),
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
