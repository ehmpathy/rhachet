import { ConstraintError } from 'helpful-errors';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { asKeyrackManifestOrgText } from './hydrate/asKeyrackManifestOrgText';
import { loadManifestHydrated } from './hydrate/loadManifestHydrated';
import { withKeyrackManifestWriteLock } from './withKeyrackManifestWriteLock';

/**
 * .what = reads the per-repo keyrack manifest
 * .why = discovers credential requirements from @gitroot/.agent/keyrack.yml
 *
 * .note = phase 1 will rewrite hydration for env-scoped format
 * .note = every write holds the manifest's dir lock and lands via temp + rename, so
 *   a reader never sees a partial file and two parallel writers never lose an edit
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

    // check and create under one lock, so two racers never both create
    return withKeyrackManifestWriteLock(
      { gitroot: input.gitroot, path },
      () => {
        // if already present, return found
        if (existsSync(path)) {
          const parsed = getManifestFileParsed({ path });
          return {
            manifestPath: path,
            org: asKeyrackManifestOrgText({
              org: parsed.org,
              fallback: input.org,
            }),
            effect: 'found' as const,
          };
        }

        // create minimal keyrack.yml with org, whole or not at all
        setFileAtomic({ path, content: stringifyYaml({ org: input.org }) });
        return {
          manifestPath: path,
          org: input.org,
          effect: 'created' as const,
        };
      },
    );
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
        throw new ConstraintError(
          'cannot add key to keyrack.yml: file does not exist',
          { path, note: 'create keyrack.yml with org declaration first' },
        );
      }

      // read, edit, and write under one lock, so a peer write is never lost
      await withKeyrackManifestWriteLock({ gitroot: input.gitroot, path }, () =>
        setKeyIntoManifestFile({ path, key: input.key, env: input.env }),
      );
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

      // read, edit, and write under one lock, so a peer write is never lost
      await withKeyrackManifestWriteLock({ gitroot: input.gitroot, path }, () =>
        delKeyFromManifestFile({ path, key: input.key, env: input.env }),
      );
    },
  },
};

/**
 * .what = read and parse a manifest file as a yaml record
 * .why = a malformed file fails loud with its path, never as a bare parse error
 */
const getManifestFileParsed = (input: {
  path: string;
}): Record<string, unknown> => {
  const content = readFileSync(input.path, 'utf8');
  try {
    return parseYaml(content) as Record<string, unknown>;
  } catch (error) {
    throw new ConstraintError('keyrack.yml has invalid yaml', {
      path: input.path,
      cause: error instanceof Error ? error : undefined,
    });
  }
};

/**
 * .what = is this env section entry the given key
 * .why = an entry is a bare key name, or a one-key map that carries its options
 */
const isEntryOfKey = (input: { entry: unknown; key: string }): boolean => {
  if (typeof input.entry === 'string') return input.entry === input.key;
  if (typeof input.entry === 'object' && input.entry !== null)
    return Object.keys(input.entry).includes(input.key);
  return false;
};

/**
 * .what = findsert a key into one env section of a manifest file
 * .why = the read-edit-write body of set.findsertKeyToEnv; the caller holds the lock
 */
const setKeyIntoManifestFile = (input: {
  path: string;
  key: string;
  env: string;
}): void => {
  const parsed = getManifestFileParsed({ path: input.path });

  // validate org declaration — a scalar or a list; the list is written back as it was read
  const isOrgDeclared =
    (typeof parsed.org === 'string' && parsed.org !== '') ||
    (Array.isArray(parsed.org) && parsed.org.length > 0);
  if (!isOrgDeclared) {
    throw new ConstraintError(
      'cannot add key to keyrack.yml: org declaration absent',
      { path: input.path, note: 'add org: <your-org> to keyrack.yml first' },
    );
  }

  // get current section (env.all for 'all', env.prod for 'prod', etc) or an empty one
  const sectionName = `env.${input.env}`;
  const section = parsed[sectionName];
  const keys: unknown[] = Array.isArray(section) ? [...section] : [];

  // findsert semantics: a key already present is a no-op
  if (keys.some((entry) => isEntryOfKey({ entry, key: input.key }))) return;

  // add key to section and write the whole file back
  setFileAtomic({
    path: input.path,
    content: stringifyYaml({ ...parsed, [sectionName]: [...keys, input.key] }),
  });
};

/**
 * .what = remove a key from one env section of a manifest file
 * .why = the read-edit-write body of del.keyFromEnv; the caller holds the lock
 */
const delKeyFromManifestFile = (input: {
  path: string;
  key: string;
  env: string;
}): void => {
  const parsed = getManifestFileParsed({ path: input.path });

  // get current section; no section means no key to remove
  const sectionName = `env.${input.env}`;
  const section = parsed[sectionName];
  if (!Array.isArray(section)) return;

  // filter out the key; an unchanged count means the key was not present
  const keysUpdated = section.filter(
    (entry) => !isEntryOfKey({ entry, key: input.key }),
  );
  if (keysUpdated.length === section.length) return;

  // drop the section entirely when it empties, and write the whole file back
  const { [sectionName]: _sectionPrior, ...parsedWithout } = parsed;
  const parsedUpdated =
    keysUpdated.length === 0
      ? parsedWithout
      : { ...parsed, [sectionName]: keysUpdated };
  setFileAtomic({ path: input.path, content: stringifyYaml(parsedUpdated) });
};
