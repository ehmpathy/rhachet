import { BadRequestError } from 'helpful-errors';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import {
  KeyrackKeySpec,
  KeyrackRepoManifest,
} from '@src/domain.objects/keyrack';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { schemaKeyrackRepoManifest } from './schema';

/**
 * .what = reads the per-repo keyrack manifest
 * .why = discovers credential requirements from @gitroot/.agent/keyrack.yml
 *
 * .note = phase 1 will rewrite hydration for env-scoped format
 */
export const daoKeyrackRepoManifest = {
  /**
   * .what = path to keyrack.yml for a repo
   */
  getPath: (input: { gitroot: string }): string =>
    join(input.gitroot, '.agent', 'keyrack.yml'),

  /**
   * .what = initialize keyrack.yml with org declaration
   * .why = creates repo manifest if it doesn't exist (findsert semantics)
   */
  init: async (input: {
    gitroot: string;
    org: string;
  }): Promise<{
    manifestPath: string;
    org: string;
    effect: 'created' | 'found';
  }> => {
    const path = join(input.gitroot, '.agent', 'keyrack.yml');

    // if already present, return found
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf8');
      const parsed = parseYaml(content) as Record<string, unknown>;
      return {
        manifestPath: path,
        org: (parsed.org as string) ?? input.org,
        effect: 'found',
      };
    }

    // create minimal keyrack.yml with org
    const manifest = { org: input.org };

    // ensure parent directory present
    mkdirSync(dirname(path), { recursive: true });

    // write yaml
    writeFileSync(path, stringifyYaml(manifest), 'utf8');

    return {
      manifestPath: path,
      org: input.org,
      effect: 'created',
    };
  },

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

  /**
   * .what = add a key to a specific env section in keyrack.yml
   * .why = regular credentials (env !== sudo) should appear in repo manifest
   *
   * .note = sudo keys are never written to keyrack.yml
   * .note = findsert semantics: no-op if key already present in section
   */
  set: {
    findsertKeyToEnv: async (input: {
      gitroot: string;
      key: string;
      env: string;
    }): Promise<void> => {
      // sudo keys never go to keyrack.yml
      if (input.env === 'sudo') return;

      const path = join(input.gitroot, '.agent', 'keyrack.yml');

      // if file doesn't exist, we can't add to it (need org declaration first)
      if (!existsSync(path)) {
        throw new BadRequestError(
          'cannot add key to keyrack.yml: file does not exist',
          { path, note: 'create keyrack.yml with org declaration first' },
        );
      }

      // read and parse current yaml
      const content = readFileSync(path, 'utf8');
      let parsed: Record<string, unknown>;
      try {
        parsed = parseYaml(content) as Record<string, unknown>;
      } catch {
        throw new BadRequestError('keyrack.yml has invalid yaml', { path });
      }

      // validate org declaration
      if (!parsed.org || typeof parsed.org !== 'string') {
        throw new BadRequestError(
          'cannot add key to keyrack.yml: org declaration absent',
          { path, note: 'add org: <your-org> to keyrack.yml first' },
        );
      }

      // determine section name (env.all for 'all', env.prod for 'prod', etc)
      const sectionName = `env.${input.env}`;

      // get current section or create empty array
      const section = parsed[sectionName];
      const keys: unknown[] = Array.isArray(section) ? [...section] : [];

      // check if key already present (findsert semantics)
      const keyFound = keys.some((entry) => {
        if (typeof entry === 'string') return entry === input.key;
        if (typeof entry === 'object' && entry !== null) {
          return Object.keys(entry).includes(input.key);
        }
        return false;
      });

      if (keyFound) return; // already present, no-op

      // add key to section
      keys.push(input.key);
      parsed[sectionName] = keys;

      // ensure parent directory exists
      mkdirSync(dirname(path), { recursive: true });

      // write updated yaml
      writeFileSync(path, stringifyYaml(parsed), 'utf8');
    },
  },

  /**
   * .what = remove a key from a specific env section in keyrack.yml
   * .why = regular credentials removed from repo manifest on del
   *
   * .note = sudo keys are never in keyrack.yml so this is a no-op for them
   * .note = idempotent: no-op if key not present
   */
  del: {
    keyFromEnv: async (input: {
      gitroot: string;
      key: string;
      env: string;
    }): Promise<void> => {
      // sudo keys never in keyrack.yml
      if (input.env === 'sudo') return;

      const path = join(input.gitroot, '.agent', 'keyrack.yml');

      // if file doesn't exist, no key to remove
      if (!existsSync(path)) return;

      // read and parse current yaml
      const content = readFileSync(path, 'utf8');
      let parsed: Record<string, unknown>;
      try {
        parsed = parseYaml(content) as Record<string, unknown>;
      } catch {
        throw new BadRequestError('keyrack.yml has invalid yaml', { path });
      }

      // determine section name
      const sectionName = `env.${input.env}`;

      // get current section
      const section = parsed[sectionName];
      if (!Array.isArray(section)) return; // no section, no key to remove

      // filter out the key
      const keysUpdated = section.filter((entry) => {
        if (typeof entry === 'string') return entry !== input.key;
        if (typeof entry === 'object' && entry !== null) {
          return !Object.keys(entry).includes(input.key);
        }
        return true;
      });

      // if count unchanged, key was not present — no-op
      if (keysUpdated.length === section.length) return;

      // update section (remove section entirely if empty)
      if (keysUpdated.length === 0) {
        delete parsed[sectionName];
      } else {
        parsed[sectionName] = keysUpdated;
      }

      // write updated yaml
      writeFileSync(path, stringifyYaml(parsed), 'utf8');
    },
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
