import { BadRequestError } from 'helpful-errors';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadManifestHydrated } from './hydrate/loadManifestHydrated';

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
   *
   * .note = when `at` is provided, creates keyrack at custom path (for role-level keyracks)
   * .note = when `at` is absent, creates keyrack at default .agent/keyrack.yml
   */
  init: async (input: {
    gitroot: string;
    org: string;
    at?: string | null;
  }): Promise<{
    manifestPath: string;
    org: string;
    effect: 'created' | 'found';
  }> => {
    // compute path: custom path (absolute or relative) or default
    const path = (() => {
      if (!input.at) return join(input.gitroot, '.agent', 'keyrack.yml');
      if (input.at.startsWith('/')) return input.at;
      return join(input.gitroot, input.at);
    })();

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
   *
   * .note = supports extends: paths for keyrack inheritance
   */
  get: async (input: {
    gitroot: string;
  }): Promise<KeyrackRepoManifest | null> => {
    const path = join(input.gitroot, '.agent', 'keyrack.yml');

    // delegate to hydrated load (handles extends resolution)
    return loadManifestHydrated({ path }, { gitroot: input.gitroot });
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
      at?: string;
    }): Promise<void> => {
      // sudo keys never go to keyrack.yml
      if (input.env === 'sudo') return;

      // use custom path if provided, otherwise default to .agent/keyrack.yml
      const path = input.at
        ? join(input.gitroot, input.at)
        : join(input.gitroot, '.agent', 'keyrack.yml');

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
      } catch (error) {
        throw new BadRequestError('keyrack.yml has invalid yaml', {
          path,
          cause: error instanceof Error ? error : undefined,
        });
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
      } catch (error) {
        throw new BadRequestError('keyrack.yml has invalid yaml', {
          path,
          cause: error instanceof Error ? error : undefined,
        });
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
