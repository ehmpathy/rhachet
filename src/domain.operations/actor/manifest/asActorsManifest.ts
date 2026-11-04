import { ConstraintError } from 'helpful-errors';

import { ActorsManifest } from '@src/domain.objects/ActorsManifest';

import { asActorDeclared } from './asActorDeclared';

/**
 * .what = whether a value is a plain object (not null, not an array)
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * .what = cast a parsed `.agent/actors.yml` into an ActorsManifest, or fail fast with the fix
 * .why = every reader (init, enroll, clone) validates the same way before any write (case=7)
 *
 * .note = checks the shape alone. base lookup, cycles and brain propagation need the other
 *         actors and the installed packages, so the expander owns them
 */
export const asActorsManifest = (input: {
  parsed: unknown;
  path: string;
}): ActorsManifest => {
  // the file is a map
  if (!isPlainObject(input.parsed))
    throw new ConstraintError('actors.yml is not a map', {
      path: input.path,
      hint: "declare `ambient: '@<slug>'` and an `actor:` list",
    });

  // the actor list is present and every entry is valid
  const { ambient, actor } = input.parsed;
  if (!Array.isArray(actor) || !actor.length)
    throw new ConstraintError('actors.yml declares no actor', {
      path: input.path,
      hint: 'add an `actor:` list of `{ slug, brain, roles }` entries',
    });
  const actors = actor.map((entry, index) =>
    asActorDeclared({ entry, index, path: input.path }),
  );

  // each slug is declared once
  const slugs = actors.map((one) => one.slug);
  const slugsTwice = slugs.filter(
    (slug, index) => slugs.indexOf(slug) !== index,
  );
  if (slugsTwice.length)
    throw new ConstraintError('actors.yml declares a slug more than once', {
      path: input.path,
      slugs: [...new Set(slugsTwice)],
      hint: 'give each actor its own slug',
    });

  // the repo actor is named by name, and is declared (F12, S9)
  if (ambient === undefined || ambient === null)
    throw new ConstraintError('actors.yml has no `ambient:` key', {
      path: input.path,
      actors: slugs.map((slug) => `@${slug}`),
      hint: `add \`ambient: '@<slug>'\` to name the repo actor — one of ${slugs.map((slug) => `'@${slug}'`).join(', ')}`,
    });
  if (typeof ambient !== 'string' || !ambient.startsWith('@'))
    throw new ConstraintError('actors.yml `ambient:` does not name an actor', {
      path: input.path,
      found: ambient,
      hint: `set \`ambient: '@<slug>'\`, quoted — one of ${slugs.map((slug) => `'@${slug}'`).join(', ')}`,
    });
  if (!slugs.includes(ambient.slice(1)))
    throw new ConstraintError(
      'actors.yml `ambient:` names an actor not declared',
      {
        path: input.path,
        found: ambient,
        actors: slugs.map((slug) => `@${slug}`),
        hint: `set \`ambient:\` to one of ${slugs.map((slug) => `'@${slug}'`).join(', ')}`,
      },
    );

  return new ActorsManifest({ ambient, actor: actors });
};
