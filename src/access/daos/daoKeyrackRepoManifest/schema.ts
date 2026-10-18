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
 * .note = rejects flat keys: format; org required, env.* sections optional
 */
export const schemaKeyrackRepoManifest = z
  .object({
    // org is an allowlist, and ⚠️ the FIRST member is the default (what @this names); a scalar
    // org is a one-member allowlist. the members are checked in loadManifestExplicit
    // (see .agent/repo=.this/role=keyrack/briefs/define.keyrack-org-allowlist.md)
    org: z.union([z.string(), z.array(z.unknown())]),
    extends: z.array(z.string()).optional(),
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
  // note: env.* sections are optional — a fresh manifest may only have org
  // env.* sections are added as keys are set (except sudo which never appears here)
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
