import { ConstraintError } from 'helpful-errors';

import type { RoleRegistryManifest } from '@src/domain.objects';
import type { ActorDeclared } from '@src/domain.objects/ActorDeclared';
import type { HasPackageRoot } from '@src/domain.operations/config/ContextConfigOfUsage';

import { asActorRefNearbyHint } from './asActorRefNearbyHint';
import type { GetPublishedActor } from './getActorExpanded';
import { getActorsPublishedOfPackage } from './getActorsPublishedOfPackage';

/**
 * .what = the published-actor lookup over the installed role packages
 * .why = `'@<repo>/<slug>'` expands from the installed package version, so a base that grows
 *        reaches every extension at the next prepare (A3)
 *
 * .note = each package's actors are read once, on the first lookup into it, and served from
 *   memory after: one lookup answers from the files as they stood at that first read, never
 *   re-read. so build one lookup per expansion (both callers do: `getOneActorExpandedOfRepo`,
 *   `getActorsManifestLinkPlan`), and never hold one across a change to the installed
 *   packages — a fresh read is a fresh lookup
 * .note = a package that is installed but could not be read fails loud with its own fault,
 *   never as absent: "install it" would send the human to a package already on disk
 * .note = a package that is installed but publishes no such slug fails loud too, with the
 *   slugs it does publish and the nearest one — a typo, or an older version
 * .note = null means one case only: no package for the repo is installed
 */
export const genGetPublishedActorOfPackages = (input: {
  manifests: HasPackageRoot<RoleRegistryManifest>[];
  failures: { packageName: string; error: Error }[];
}): GetPublishedActor => {
  const actorsByRepo = new Map<string, ActorDeclared[]>();
  return ({ repo, slug }) => {
    // find the installed package for the repo
    const manifest = input.manifests.find((one) => one.slug === repo);

    // installed but unreadable → its fault, never "absent"
    const failure = manifest
      ? undefined
      : input.failures.find((one) =>
          one.packageName.endsWith(`rhachet-roles-${repo}`),
        );
    if (failure)
      throw new ConstraintError(
        `the role package that publishes @${repo}/${slug} could not be read: ${failure.packageName}`,
        {
          package: failure.packageName,
          cause: failure.error,
          hint: `repair or reinstall ${failure.packageName} — its rhachet.repo.yml failed to load`,
        },
      );

    // not installed → no actor
    if (!manifest) return null;

    // read its published actors once, then look the slug up
    const actors =
      actorsByRepo.get(repo) ??
      getActorsPublishedOfPackage({ packageRoot: manifest.packageRoot });
    actorsByRepo.set(repo, actors);
    const found = actors.find((one) => one.slug === slug);
    if (found) return found;

    // installed, yet the slug is not among its published actors: name the ones it does publish
    const slugsPublished = actors.map((one) => one.slug);
    throw new ConstraintError(
      `rhachet-roles-${repo} is installed, and publishes no actor @${repo}/${slug}`,
      {
        actor: `@${repo}/${slug}`,
        published: slugsPublished.map((one) => `@${repo}/${one}`),
        hint:
          slugsPublished.length > 0
            ? `${asActorRefNearbyHint({ ref: `@${slug}`, slugs: slugsPublished }).replace(/'@/g, `'@${repo}/`)} — or upgrade rhachet-roles-${repo}, if a newer version publishes it`
            : `rhachet-roles-${repo} publishes no actors at this version — upgrade it, or list its roles in .agent/actors.yml`,
      },
    );
  };
};
