import { BadRequestError } from 'helpful-errors';

import {
  KeyrackKeySpec,
  KeyrackRepoManifest,
} from '@src/domain.objects/keyrack';

import { join } from 'node:path';
import {
  type KeyrackManifestExplicit,
  loadManifestExplicit,
} from './loadManifestExplicit';

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
    if (!key) throw new BadRequestError('empty key entry in keyrack manifest');
    return { key, grade: parseGradeShorthand(gradeStr) };
  }

  throw new BadRequestError('invalid key entry in keyrack manifest', { entry });
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

/**
 * .what = extract keys from env sections of a manifest
 * .why = reusable key extraction for both root and extended manifests
 *
 * .note = env.all keys create both .all. slugs AND expand to declared envs
 * .note = .all. slugs are always created for env.all keys (directly resolvable)
 */
const extractKeysFromEnvSections = (input: {
  org: string;
  envSections: Record<string, unknown[]>;
}): Record<string, KeyrackKeySpec> => {
  const keys: Record<string, KeyrackKeySpec> = {};
  const { org, envSections } = input;

  // identify declared envs (env.* sections except env.all)
  const declaredEnvs = Object.keys(envSections)
    .filter((k) => k !== 'env.all')
    .map((k) => k.slice(4)); // remove 'env.' prefix

  // extract env.all entries
  const envAllEntries: Array<{
    key: string;
    grade: KeyrackKeySpec['grade'];
  }> = [];
  const envAll = envSections['env.all'];
  if (Array.isArray(envAll)) {
    for (const entry of envAll) {
      envAllEntries.push(parseKeyEntry(entry));
    }
  }

  // register env.all keys with .all. slug (always directly resolvable)
  for (const { key, grade } of envAllEntries) {
    const slug = `${org}.all.${key}`;
    keys[slug] = new KeyrackKeySpec({
      slug,
      mech: 'REPLICA',
      env: 'all',
      name: key,
      grade,
    });
  }

  // register keys for each declared env
  for (const env of declaredEnvs) {
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
    const envEntries = envSections[`env.${env}`];
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

  return keys;
};

/**
 * .what = hydrates KeyrackRepoManifest from explicit manifest with extends resolution
 * .why = centralizes hydration logic with recursive extends traversal
 *
 * .note = merge semantics:
 *   - later extends override earlier extends (last-wins)
 *   - root keys override all extended keys (root-wins)
 *   - org is taken from root manifest only (not inherited)
 */
export const hydrateKeyrackRepoManifest = (
  input: {
    explicit: KeyrackManifestExplicit;
    manifestPath: string;
    visited?: Set<string>;
  },
  context: {
    gitroot: string;
  },
): KeyrackRepoManifest => {
  const { explicit, manifestPath } = input;
  const visited = input.visited ?? new Set<string>();

  // check for circular extends
  if (visited.has(manifestPath)) {
    throw new BadRequestError('circular extends detected in keyrack chain', {
      manifestPath,
      visitedPaths: Array.from(visited),
    });
  }

  // add current path to visited set
  visited.add(manifestPath);

  // collect keys from extended manifests (in order, last-wins)
  let mergedKeys: Record<string, KeyrackKeySpec> = {};
  const extendsChain: string[] = [];

  if (explicit.extends && explicit.extends.length > 0) {
    for (const extendPath of explicit.extends) {
      // compute absolute path from gitroot
      const absolutePath = join(context.gitroot, extendPath);

      // load extended manifest
      const extendedExplicit = loadManifestExplicit({ path: absolutePath });
      if (!extendedExplicit) {
        throw new BadRequestError('extended keyrack not found', {
          path: extendPath,
          absolutePath,
          from: manifestPath,
        });
      }

      // recursively hydrate extended manifest
      const extendedManifest = hydrateKeyrackRepoManifest(
        {
          explicit: extendedExplicit,
          manifestPath: absolutePath,
          visited,
        },
        context,
      );

      // merge extended keys (last-wins)
      mergedKeys = { ...mergedKeys, ...extendedManifest.keys };

      // track extends chain for debug
      extendsChain.push(extendPath);
      if (extendedManifest.extends) {
        extendsChain.push(...extendedManifest.extends);
      }
    }
  }

  // extract keys from root manifest (use root org for slugs)
  const rootKeys = extractKeysFromEnvSections({
    org: explicit.org,
    envSections: explicit.envSections,
  });

  // root keys override extended keys (root-wins)
  const finalKeys = { ...mergedKeys, ...rootKeys };

  // extract declared envs from root manifest
  const envSections = Object.keys(explicit.envSections)
    .filter((k) => k !== 'env.all')
    .map((k) => k.slice(4));

  return new KeyrackRepoManifest({
    org: explicit.org,
    envs: envSections,
    keys: finalKeys,
    extends: extendsChain.length > 0 ? extendsChain : undefined,
  });
};
