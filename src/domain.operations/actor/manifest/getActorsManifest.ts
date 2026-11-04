import { ConstraintError } from 'helpful-errors';
import { parse as parseYaml } from 'yaml';

import type { ActorsManifest } from '@src/domain.objects/ActorsManifest';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { asActorsManifest } from './asActorsManifest';

/**
 * .what = the path of a repo's actors manifest — `.agent/actors.yml`, a peer of `keyrack.yml`
 */
export const getActorsManifestPath = (input: { repoPath: string }): string =>
  join(input.repoPath, '.agent', 'actors.yml');

/**
 * .what = whether a yaml parse failed on a plain value that opens with a reserved `@`
 */
const isErrorOfBareAtValue = (input: { error: unknown }): boolean =>
  (input.error as { code?: string } | null)?.code === 'BAD_SCALAR_START';

/**
 * .what = read and validate a repo's `.agent/actors.yml`
 * .why = every reader (init, enroll, clone) reads the manifest through one path, so each
 *        validates the same way before any write (case=7)
 *
 * .note = an absent file returns null — today's behavior holds where no repo opts in (case=5)
 */
export const getActorsManifest = (input: {
  repoPath: string;
}): ActorsManifest | null => {
  // absent → no manifest; the caller keeps today's behavior
  const path = getActorsManifestPath({ repoPath: input.repoPath });
  if (!existsSync(path)) return null;

  // parse the yaml; a bare `@` value names the quote fix
  const parsed = ((): unknown => {
    try {
      return parseYaml(readFileSync(path, 'utf8'));
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (isErrorOfBareAtValue({ error }))
        throw new ConstraintError('actors.yml has an unquoted `@` value', {
          path,
          error: error.message,
          hint: "quote each value that opens with `@` — yaml reserves it: `ambient: '@builder'`, `- '@ehmpathy/builder'`",
        });
      throw new ConstraintError('actors.yml has invalid yaml', {
        path,
        error: error.message,
        hint: 'fix the yaml at the line the error names',
      });
    }
  })();

  // validate the shape
  return asActorsManifest({ parsed, path });
};
