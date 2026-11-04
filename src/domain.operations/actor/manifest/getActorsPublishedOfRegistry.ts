import { ConstraintError } from 'helpful-errors';
import { parse as parseYaml } from 'yaml';

import type { ActorDeclared } from '@src/domain.objects/ActorDeclared';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';

import { existsSync, readFileSync } from 'node:fs';
import { asActorsPublished } from './asActorsPublished';

/**
 * .what = read the actors a role registry publishes, from the yml its `actors.uri` names
 * .why = `repo introspect` inlines them into `rhachet.repo.yml`, so a consumer reads them
 *        from the installed package with no import of its code
 *
 * .note = a registry with no `actors` ref publishes none, and returns []
 */
export const getActorsPublishedOfRegistry = (input: {
  registry: RoleRegistry;
}): ActorDeclared[] => {
  // no ref → no published actors
  const path = input.registry.actors?.uri;
  if (!path) return [];

  // the ref must name a file
  if (!existsSync(path))
    throw new ConstraintError(
      'getRoleRegistry names an actors yml that is absent',
      {
        path,
        hint: 'add the yml at that path, or drop `actors` from getRoleRegistry',
      },
    );

  // parse and validate in the consumer shape, with no `ambient:` (F9)
  const parsed = ((): unknown => {
    try {
      return parseYaml(readFileSync(path, 'utf8'));
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      throw new ConstraintError('published actors yml has invalid yaml', {
        path,
        error: error.message,
        hint: 'fix the yaml at the line the error names; quote each value that opens with `@`',
      });
    }
  })();
  return asActorsPublished({ parsed, path });
};
