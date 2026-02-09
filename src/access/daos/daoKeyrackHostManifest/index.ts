import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  KeyrackHostManifest,
  KeyrackKeyHost,
} from '../../../domain.objects/keyrack';
import { schemaKeyrackHostManifest } from './schema';

/**
 * .what = resolves the home directory
 * .why = uses HOME env var to support test isolation
 *
 * .note = os.homedir() caches at module load; we read process.env.HOME directly
 */
const getHomeDir = (): string => {
  const home = process.env.HOME;
  if (!home) throw new UnexpectedCodePathError('HOME not set', {});
  return home;
};

/**
 * .what = resolves the host manifest path
 * .why = expands ~ to home directory
 */
const getHostManifestPath = (): string => {
  const home = getHomeDir();
  return join(home, '.rhachet', 'keyrack.manifest.json');
};

/**
 * .what = persistence for the per-machine host manifest
 * .why = stores key hosts in ~/.rhachet/keyrack.manifest.json
 */
export const daoKeyrackHostManifest = {
  /**
   * .what = read the host manifest from disk
   * .why = loads credential storage config for this machine
   */
  get: async (input: {}): Promise<KeyrackHostManifest | null> => {
    const path = getHostManifestPath();

    // return null if file does not exist
    if (!existsSync(path)) return null;

    // read and parse json
    const content = readFileSync(path, 'utf8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new BadRequestError('keyrack.manifest.json has invalid json', {
        path,
      });
    }

    // validate schema
    const result = schemaKeyrackHostManifest.safeParse(parsed);
    if (!result.success) {
      throw new BadRequestError('keyrack.manifest.json has invalid schema', {
        path,
        issues: result.error.issues,
      });
    }

    // hydrate domain objects
    const hosts: Record<string, KeyrackKeyHost> = {};
    for (const [slug, host] of Object.entries(result.data.hosts)) {
      hosts[slug] = new KeyrackKeyHost(host);
    }

    return new KeyrackHostManifest({
      uri: result.data.uri,
      hosts,
    });
  },

  /**
   * .what = write the host manifest to disk
   * .why = persists credential storage config for this machine
   * .note = supports findsert (no update on match) and upsert (update on match)
   */
  set: async (
    input: PickOne<{
      findsert: KeyrackHostManifest;
      upsert: KeyrackHostManifest;
    }>,
  ): Promise<KeyrackHostManifest> => {
    // resolve which manifest to persist
    const manifestDesired = input.findsert ?? input.upsert;
    if (!manifestDesired)
      throw new UnexpectedCodePathError(
        'set requires either findsert or upsert',
        { input },
      );

    // check if manifest already exists
    const manifestFound = await daoKeyrackHostManifest.get({});

    // handle findsert: return found if exists with same uri
    if (input.findsert && manifestFound) {
      if (manifestFound.uri === input.findsert.uri) return manifestFound;
      throw new BadRequestError(
        'can not findsert; manifest already exists with different uri',
        { uriFound: manifestFound.uri, uriDesired: input.findsert.uri },
      );
    }

    // persist the manifest
    const path = getHostManifestPath();

    // ensure directory exists
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // serialize and write
    const content = JSON.stringify(manifestDesired, null, 2);
    writeFileSync(path, content, 'utf8');

    return manifestDesired;
  },
};
