import { ConstraintError } from 'helpful-errors';

import type { ContextCli } from '@src/domain.objects/ContextCli';

import type { ActorExpanded } from './getActorExpanded';
import { getActorsManifest, getActorsManifestPath } from './getActorsManifest';

/**
 * .what = one declared actor of this repo's `.agent/actors.yml`, expanded over the installed
 *         role packages — by slug, or the `ambient:` actor; null where the repo has no manifest
 * .why = the repo actor's roles (init, enroll) and the actor form (`rhx clone @<slug>`) each
 *        expand one declared actor; one path keeps them in agreement
 *
 * .note = an unknown slug fails fast and lists the declared actors (S6)
 * .note = the installed packages are read only under a manifest, so a repo with none pays no
 *         extra load (`rule.require.thinnest-import-path`)
 */
export const getOneActorExpandedOfRepo = async (
  input: { actor: { ambient: true } | { slug: string } },
  context: ContextCli,
): Promise<ActorExpanded | null> => {
  // no manifest → no declared actor
  const manifest = getActorsManifest({ repoPath: context.gitroot });
  if (!manifest) return null;

  // the actor by slug, or the `ambient:` actor; an unknown slug lists the declared ones
  const ref = 'slug' in input.actor ? `@${input.actor.slug}` : manifest.ambient;
  const isDeclared = manifest.actor.some((actor) => `@${actor.slug}` === ref);
  if (!isDeclared)
    throw new ConstraintError(`${ref} is not a declared actor`, {
      actor: ref,
      path: getActorsManifestPath({ repoPath: context.gitroot }),
      hint: `declared actors: ${manifest.actor.map((actor) => `@${actor.slug}`).join(', ')}`,
    });

  // expand it over the installed packages
  const [
    { getRoleRegistriesByConfigImplicit },
    { genGetPublishedActorOfPackages },
    { getActorExpanded },
  ] = await Promise.all([
    import('@src/domain.operations/config/getRoleRegistriesByConfigImplicit'),
    import('./genGetPublishedActorOfPackages'),
    import('./getActorExpanded'),
  ]);
  const { manifests } = await getRoleRegistriesByConfigImplicit(context);
  return getActorExpanded(
    { ref, scope: null, trail: [] },
    {
      manifest,
      getPublishedActor: genGetPublishedActorOfPackages({ manifests }),
    },
  );
};
