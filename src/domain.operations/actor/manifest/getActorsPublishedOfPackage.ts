import { ConstraintError } from 'helpful-errors';
import { parse as parseYaml } from 'yaml';

import type { ActorDeclared } from '@src/domain.objects/ActorDeclared';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { asActorsPublished } from './asActorsPublished';

/**
 * .what = read the actors an installed role package publishes, from its `rhachet.repo.yml`
 * .why = a consumer's `'@<repo>/<slug>'` base expands from the installed package version, so a
 *        base that grows reaches every extension at the next prepare (A3)
 *
 * .note = a package with no `actors:` key publishes none, and returns []. an older
 *         `rhachet.repo.yml` holds no such key, so every extant package reads as []
 */
export const getActorsPublishedOfPackage = (input: {
  packageRoot: string;
}): ActorDeclared[] => {
  // read the manifest; a package with no manifest publishes no actors
  const path = join(input.packageRoot, 'rhachet.repo.yml');
  if (!existsSync(path)) return [];

  // read outside the parse guard, so a read fault is never labelled bad yaml
  const content = readFileSync(path, 'utf8');
  const parsed = ((): unknown => {
    try {
      return parseYaml(content);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      throw new ConstraintError('rhachet.repo.yml has invalid yaml', {
        path,
        error: error.message,
        hint: 'rerun `npx rhachet repo introspect` in the role package, then republish',
        cause: error,
      });
    }
  })();

  // no `actors:` key → no published actors
  const actors =
    typeof parsed === 'object' && parsed !== null && 'actors' in parsed
      ? parsed.actors
      : undefined;
  if (actors === undefined || actors === null) return [];

  // validate the published list in the consumer shape
  return asActorsPublished({ parsed: { actor: actors }, path });
};
