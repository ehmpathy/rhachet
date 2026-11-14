import { ConstraintError } from 'helpful-errors';

import type { ActorDeclared } from '@src/domain.objects/ActorDeclared';

import { asActorDeclared } from './asActorDeclared';
import { asSlugsDuplicated } from './asSlugsDuplicated';
import { isPlainObject } from './isPlainObject';

/**
 * .what = cast a role package's parsed actor yml into its published actors, or fail fast
 * .why = a package publishes the actors it recommends in the consumer shape, so a consumer
 *        adopts or extends them by name (`@<repo>/<slug>`)
 *
 * .note = an `ambient:` key is refused: the repo actor is the consumer's choice, never the
 *         package's (F9)
 */
export const asActorsPublished = (input: {
  parsed: unknown;
  path: string;
}): ActorDeclared[] => {
  // the file is a map
  if (!isPlainObject(input.parsed))
    throw new ConstraintError('published actors yml is not a map', {
      path: input.path,
      hint: 'declare an `actor:` list of `{ slug, brain, roles }` entries',
    });

  // a package may not name the repo actor (F9)
  if ('ambient' in input.parsed)
    throw new ConstraintError('published actors yml declares `ambient:`', {
      path: input.path,
      hint: "remove `ambient:` — the consumer names its repo actor in its own `.agent/actors.yml`, e.g. `ambient: '@builder'`",
    });

  // the actor list is present and every entry is valid
  const { actor } = input.parsed;
  if (!Array.isArray(actor) || !actor.length)
    throw new ConstraintError('published actors yml declares no actor', {
      path: input.path,
      hint: 'add an `actor:` list of `{ slug, brain, roles }` entries',
    });
  const actors = actor.map((entry, index) =>
    asActorDeclared({ entry, index, path: input.path }),
  );

  // each slug is declared once
  const slugsTwice = asSlugsDuplicated({
    slugs: actors.map((one) => one.slug),
  });
  if (slugsTwice.length)
    throw new ConstraintError(
      'published actors yml declares a slug more than once',
      {
        path: input.path,
        slugs: [...new Set(slugsTwice)],
        hint: 'give each actor its own slug',
      },
    );

  return actors;
};
