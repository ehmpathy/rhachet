import { BadRequestError } from 'helpful-errors';
import { parse as parseYaml } from 'yaml';

import { existsSync, readFileSync } from 'node:fs';
import { schemaKeyrackRepoManifest } from '../schema';

/**
 * .what = raw keyrack manifest without extends resolution
 * .why = return type for loadManifestExplicit (preserves extends paths)
 */
export interface KeyrackManifestExplicit {
  org: string;
  extends?: string[];
  envSections: Record<string, unknown[]>;
}

/**
 * .what = loads keyrack manifest from file path without extends resolution
 * .why = raw access for validation, inspection, or when extends already handled
 */
export const loadManifestExplicit = (input: {
  path: string;
}): KeyrackManifestExplicit | null => {
  // return null if file does not exist
  if (!existsSync(input.path)) return null;

  // read file content
  const content = readFileSync(input.path, 'utf8');

  // parse yaml
  let parsed: unknown;
  try {
    parsed = parseYaml(content);
  } catch (error) {
    throw new BadRequestError('keyrack manifest has invalid yaml', {
      path: input.path,
      cause: error instanceof Error ? error : undefined,
    });
  }

  // validate schema
  const result = schemaKeyrackRepoManifest.safeParse(parsed);
  if (!result.success) {
    throw new BadRequestError('keyrack manifest has invalid schema', {
      path: input.path,
      issues: result.error.issues,
    });
  }

  // extract org and extends
  const org = result.data.org;
  const extendsArr = result.data.extends;

  // extract env sections
  // note: null values are treated as empty arrays (declared but empty env)
  const envSections: Record<string, unknown[]> = {};
  for (const key of Object.keys(result.data)) {
    if (key.startsWith('env.')) {
      const envEntries = (result.data as Record<string, unknown>)[key];
      if (Array.isArray(envEntries)) {
        envSections[key] = envEntries;
      } else if (envEntries === null) {
        // null means "declared but empty" — register as empty array
        envSections[key] = [];
      }
    }
  }

  return {
    org,
    extends: extendsArr,
    envSections,
  };
};
