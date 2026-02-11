import { z } from 'zod';

/**
 * .what = zod schema for a key entry in env.* arrays
 * .why = validates key declarations: bare string or { KEY: grade_shorthand }
 */
const schemaKeyrackKeyEntry = z.union([
  z.string(),
  z.record(z.string(), z.string().nullable()),
]);

/**
 * .what = zod schema for KeyrackRepoManifest (env-scoped format)
 * .why = validates manifest from @gitroot/.agent/keyrack.yml
 *
 * .note = rejects flat keys: format; requires org + env.* sections
 */
export const schemaKeyrackRepoManifest = z
  .object({
    org: z.string(),
  })
  .catchall(z.unknown())
  .refine(
    (data) => {
      // reject flat keys: format
      if ('keys' in data) return false;
      return true;
    },
    {
      message:
        'flat keys: format is no longer supported; use org + env.* sections instead',
    },
  )
  .refine(
    (data) => {
      // require at least one env.* section
      const envKeys = Object.keys(data).filter((k) => k.startsWith('env.'));
      return envKeys.length > 0;
    },
    { message: 'at least one env.* section is required' },
  )
  .refine(
    (data) => {
      // env.all requires at least one env-specific section
      const hasEnvAll = 'env.all' in data;
      const envSpecific = Object.keys(data).filter(
        (k) => k.startsWith('env.') && k !== 'env.all',
      );
      if (hasEnvAll && envSpecific.length === 0) return false;
      return true;
    },
    {
      message:
        'env.all requires at least one env-specific section (e.g., env.prod)',
    },
  );

export type SchemaKeyrackRepoManifest = z.infer<
  typeof schemaKeyrackRepoManifest
>;
