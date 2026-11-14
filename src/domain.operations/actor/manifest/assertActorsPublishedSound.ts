import { ConstraintError } from 'helpful-errors';

import type { ActorDeclared } from '@src/domain.objects/ActorDeclared';

/**
 * .what = the slug of the peer a base ref names within this same package, or null where the
 *         ref names another package (or the entry is no base at all)
 */
const asBaseSlugLocal = (input: {
  entry: string | undefined;
  repo: string;
}): string | null => {
  if (!input.entry?.startsWith('@')) return null;
  const body = input.entry.slice(1);
  const slashIndex = body.indexOf('/');
  if (slashIndex < 0) return body;
  if (body.slice(0, slashIndex) !== input.repo) return null;
  return body.slice(slashIndex + 1);
};

/**
 * .what = the role slug a concrete or `+` entry names within this same package, or null
 */
const asRoleSlugLocal = (input: {
  entry: string;
  repo: string;
}): string | null => {
  if (input.entry.startsWith('@') || input.entry.startsWith('-')) return null;
  const body = input.entry.startsWith('+') ? input.entry.slice(1) : input.entry;
  const prefix = `${input.repo}/`;
  if (!body.startsWith(prefix)) return null;
  return body.slice(prefix.length);
};

/**
 * .what = refuse a published actor set that would fail in every consumer's `init`
 * .why = `repo introspect` is the last moment the package author can see the fault. a broken
 *        `@<repo>/<slug>` that ships fails only at a consumer's next `pnpm install`, far from
 *        the author who can fix it
 *
 * .note = checks what the package alone can settle: a local base names a declared peer, local
 *         bases form no cycle, and a role of this package names a role it declares. a base or
 *         role of another package is the consumer's to settle, against what it installed
 * .note = brain reach needs no check here: `asActorDeclared` already refuses a base-less actor
 *         with no brain, so every local chain ends at an actor that holds one
 */
export const assertActorsPublishedSound = (input: {
  actors: ActorDeclared[];
  repo: string;
  roles: string[];
  path: string;
}): void => {
  // each role of this package names a role the package declares
  for (const actor of input.actors) {
    const roleUnknown = actor.roles.find((entry) => {
      const slug = asRoleSlugLocal({ entry, repo: input.repo });
      return slug !== null && !input.roles.includes(slug);
    });
    if (roleUnknown)
      throw new ConstraintError(
        `published actor @${input.repo}/${actor.slug} names a role this package does not declare: '${roleUnknown}'`,
        {
          path: input.path,
          roles: input.roles,
          hint: 'check the role slug for a typo, or add the role to getRoleRegistry',
        },
      );
  }

  // each local base names a declared peer, and no local chain loops
  const actorsBySlug = new Map(input.actors.map((one) => [one.slug, one]));
  const walk = (slug: string, trail: string[]): void => {
    if (trail.includes(slug))
      throw new ConstraintError('published actors yml has an extension cycle', {
        path: input.path,
        cycle: [...trail, slug].map((one) => `@${one}`).join(' → '),
        hint: 'break the cycle: one actor in the path must list concrete roles',
      });
    const actor = actorsBySlug.get(slug);
    if (!actor)
      throw new ConstraintError(
        `published actor @${input.repo}/${trail.at(-1)} extends a peer not declared: @${slug}`,
        {
          path: input.path,
          actors: input.actors.map((one) => `@${one.slug}`),
          hint: 'declare the base in this package, or name a published actor of another package as `@<repo>/<slug>`',
        },
      );
    const slugNext = asBaseSlugLocal({
      entry: actor.roles[0],
      repo: input.repo,
    });
    if (slugNext !== null) walk(slugNext, [...trail, slug]);
  };
  for (const actor of input.actors) walk(actor.slug, []);
};
