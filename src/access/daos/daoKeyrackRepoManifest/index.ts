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

    // hydrate domain objects, inject slug from map key
    const keys: Record<string, KeyrackKeySpec> = {};
    for (const [slug, spec] of Object.entries(result.data.keys)) {
      keys[slug] = new KeyrackKeySpec({ ...spec, slug });
    }

    return new KeyrackRepoManifest({ keys });
  },
};
