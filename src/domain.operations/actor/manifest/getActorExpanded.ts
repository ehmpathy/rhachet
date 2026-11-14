import { ConstraintError } from 'helpful-errors';

import type { ActorDeclared } from '@src/domain.objects/ActorDeclared';
import type { ActorsManifest } from '@src/domain.objects/ActorsManifest';
import type { BrainSlug } from '@src/domain.objects/BrainSlug';

import { asActorRefNearbyHint } from './asActorRefNearbyHint';
import { asActorRolesWithDeltas } from './asActorRolesWithDeltas';

/**
 * .what = an actor expanded to concrete roles, with the source of each role named
 */
export interface ActorExpanded {
  slug: string;
  brain: BrainSlug;
  roles: string[];

  /**
   * .what = for each role, the actor ref it came in through (`@ehmpathy/builder`), or null
   *         where this actor lists it itself
   * .why = the drift report names each role's declared source (`via @ehmpathy/builder`, A5)
   */
  rolesVia: Record<string, string | null>;

  /**
   * .what = a `-role` that named a role the base lacks — intent holds, so warn, never refuse
   */
  warnings: string[];
}

/**
 * .what = the lookup for a published actor (`@<repo>/<slug>`) from installed role packages
 * .note = injected, so the expander stays pure; returns null where the package or actor is absent
 */
export type GetPublishedActor = (input: {
  repo: string;
  slug: string;
}) => ActorDeclared | null;

/**
 * .what = split an actor ref (`@slug` or `@repo/slug`) into its parts
 */
const asActorRefParts = (input: {
  ref: string;
}): { repo: string | null; slug: string } => {
  const body = input.ref.slice(1);
  const slashIndex = body.indexOf('/');
  if (slashIndex < 0) return { repo: null, slug: body };
  return { repo: body.slice(0, slashIndex), slug: body.slice(slashIndex + 1) };
};

/**
 * .what = find the declared actor a ref names, or refuse with the candidates
 */
const getActorDeclaredByRef = (input: {
  ref: string;
  scope: string | null;
  manifest: ActorsManifest;
  getPublishedActor: GetPublishedActor;
}): { actor: ActorDeclared; scope: string | null } => {
  // a local ref within a published actor names a peer of that same package
  const partsAsWritten = asActorRefParts({ ref: input.ref });
  const parts =
    partsAsWritten.repo === null && input.scope !== null
      ? { repo: input.scope, slug: partsAsWritten.slug }
      : partsAsWritten;

  // a local ref names a peer in this manifest
  if (parts.repo === null) {
    const found = input.manifest.actor.find((one) => one.slug === parts.slug);
    if (found) return { actor: found, scope: null };
    throw new ConstraintError(
      `actors.yml names an actor not declared: ${input.ref}`,
      {
        ref: input.ref,
        actors: input.manifest.actor.map((one) => `@${one.slug}`),
        hint: `${asActorRefNearbyHint({ ref: input.ref, slugs: input.manifest.actor.map((one) => one.slug) })}, or a published actor as '@<repo>/<slug>'`,
      },
    );
  }

  // a qualified ref names a published actor of an installed package
  const published = input.getPublishedActor({
    repo: parts.repo,
    slug: parts.slug,
  });
  if (published) return { actor: published, scope: parts.repo };
  throw new ConstraintError(
    `actors.yml names a published actor not found: ${input.ref}`,
    {
      ref: input.ref,
      hint: `install the role package that publishes it (rhachet-roles-${parts.repo}), or check the slug`,
    },
  );
};

/**
 * .what = expand one declared actor, through its bases, into concrete `{ brain, roles }`
 * .why = a base that grows reaches every actor that extends it at the next read, since the
 *        expansion reads the installed base each time (A3)
 *
 * .note = the brain propagates up from the base; a local `brain:` overrides it (F11, S8).
 *         an actor that reaches no brain is refused, with the field named
 * .note = `trail` holds the canonical refs already on the path, so a cycle is refused with its path
 * .note = `scope` is the repo of the published set that declared `ref`, or null for the
 *         consumer's own manifest; a local `@peer` within a published actor resolves in its scope
 */
export const getActorExpanded = (
  input: { ref: string; scope: string | null; trail: string[] },
  context: { manifest: ActorsManifest; getPublishedActor: GetPublishedActor },
): ActorExpanded => {
  // refuse a cycle before any expansion
  const parts = asActorRefParts({ ref: input.ref });
  const refCanonical =
    parts.repo === null && input.scope !== null
      ? `@${input.scope}/${parts.slug}`
      : input.ref;
  if (input.trail.includes(refCanonical))
    throw new ConstraintError('actors.yml has an extension cycle', {
      cycle: [...input.trail, refCanonical].join(' → '),
      hint: 'break the cycle: one actor in the path must list concrete roles',
    });

  // find the declared actor
  const { actor, scope } = getActorDeclaredByRef({
    ref: input.ref,
    scope: input.scope,
    manifest: context.manifest,
    getPublishedActor: context.getPublishedActor,
  });

  // no base → the roles are concrete and the brain is the actor's own
  const [head, ...rest] = actor.roles;
  if (!head?.startsWith('@')) {
    if (!actor.brain)
      throw new ConstraintError(`actor ${input.ref} reaches no brain`, {
        ref: input.ref,
        hint: 'add `brain: <slug>` to the actor',
      });
    return {
      slug: actor.slug,
      brain: actor.brain,
      roles: actor.roles,
      rolesVia: Object.fromEntries(actor.roles.map((role) => [role, null])),
      warnings: [],
    };
  }

  // expand the base, then apply the deltas over it
  const base = getActorExpanded(
    { ref: head, scope, trail: [...input.trail, refCanonical] },
    context,
  );
  const { rolesKept, rolesAdded, warnings } = asActorRolesWithDeltas({
    ref: input.ref,
    base: { ref: head, roles: base.roles },
    deltas: rest,
  });

  // the brain propagates up from the base; a local brain overrides it
  return {
    slug: actor.slug,
    brain: actor.brain ?? base.brain,
    roles: [...rolesKept, ...rolesAdded],
    rolesVia: {
      ...Object.fromEntries(rolesKept.map((role) => [role, head])),
      ...Object.fromEntries(rolesAdded.map((role) => [role, null])),
    },
    warnings: [...base.warnings, ...warnings],
  };
};
