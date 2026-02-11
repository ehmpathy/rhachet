import { BadRequestError } from 'helpful-errors';
import { parse as parseYaml } from 'yaml';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  KeyrackKeySpec,
  KeyrackRepoManifest,
} from '../../../domain.objects/keyrack';
import { schemaKeyrackRepoManifest } from './schema';

/**
 * .what = reads the per-repo keyrack manifest
 * .why = discovers credential requirements from @gitroot/.agent/keyrack.yml
 *
 * .note = phase 1 will rewrite hydration for env-scoped format
 */
export const daoKeyrackRepoManifest = {
  /**
   * .what = read the repo manifest from disk
   * .why = discovers which keys this repo requires
   */
  get: async (input: {
    gitroot: string;
  }): Promise<KeyrackRepoManifest | null> => {
    const path = join(input.gitroot, '.agent', 'keyrack.yml');

    // return null if file does not exist
    if (!existsSync(path)) return null;

    // read file content
    const content = readFileSync(path, 'utf8');

    // parse yaml
    let parsed: unknown;
    try {
      parsed = parseYaml(content);
    } catch {
      throw new BadRequestError('keyrack.yml has invalid yaml', {
        path,
      });
    }

    // validate schema
    const result = schemaKeyrackRepoManifest.safeParse(parsed);
    if (!result.success) {
      throw new BadRequestError('keyrack.yml has invalid schema', {
        path,
        issues: result.error.issues,
      });
    }

    // hydrate domain objects from env-scoped sections
    const org = result.data.org;
    const envSections = Object.keys(result.data)
      .filter((k) => k.startsWith('env.') && k !== 'env.all')
      .map((k) => k.slice(4));
    const keys: Record<string, KeyrackKeySpec> = {};

    // expand env.all keys into each declared env
    const envAllEntries: Array<{
      key: string;
      grade: KeyrackKeySpec['grade'];
    }> = [];
    const envAll = (result.data as Record<string, unknown>)['env.all'];
    if (Array.isArray(envAll)) {
      for (const entry of envAll) {
        const parsed = parseKeyEntry(entry);
        envAllEntries.push(parsed);
      }
    }

    // register env-specific keys and expand env.all
    for (const env of envSections) {
      // expand env.all keys for this env
      for (const { key, grade } of envAllEntries) {
        const slug = `${org}.${env}.${key}`;
        keys[slug] = new KeyrackKeySpec({
          slug,
          mech: 'REPLICA',
          env,
          name: key,
          grade,
        });
      }

      // add env-specific keys (override env.all grade if same key)
      const envEntries = (result.data as Record<string, unknown>)[`env.${env}`];
      if (Array.isArray(envEntries)) {
        for (const entry of envEntries) {
          const { key, grade } = parseKeyEntry(entry);
          const slug = `${org}.${env}.${key}`;
          keys[slug] = new KeyrackKeySpec({
            slug,
            mech: 'REPLICA',
            env,
            name: key,
            grade,
          });
        }
      }
    }

    return new KeyrackRepoManifest({ org, envs: envSections, keys });
  },
};

/**
 * .what = parse a key entry from env.* array
 * .why = handles both bare key names and key:grade shorthand
 */
const parseKeyEntry = (
  entry: unknown,
): { key: string; grade: KeyrackKeySpec['grade'] } => {
  // bare string: just key name, no grade
  if (typeof entry === 'string') return { key: entry, grade: null };

  // object: { KEY_NAME: 'encrypted' } or { KEY_NAME: 'ephemeral' } etc
  if (typeof entry === 'object' && entry !== null) {
    const [key, gradeStr] = Object.entries(entry)[0] ?? [];
    if (!key) throw new BadRequestError('empty key entry in keyrack.yml');
    return { key, grade: parseGradeShorthand(gradeStr) };
  }

  throw new BadRequestError('invalid key entry in keyrack.yml', { entry });
};

/**
 * .what = parse grade shorthand string to grade shape
 * .why = converts 'encrypted', 'ephemeral', 'encrypted,ephemeral' to structured grade
 */
const parseGradeShorthand = (gradeStr: unknown): KeyrackKeySpec['grade'] => {
  if (gradeStr == null || gradeStr === '') return null;
  if (typeof gradeStr !== 'string') return null;

  const parts = gradeStr.split(',').map((s) => s.trim());
  return {
    protection: parts.includes('encrypted') ? 'encrypted' : null,
    duration: parts.includes('ephemeral') ? 'ephemeral' : null,
  };
};
