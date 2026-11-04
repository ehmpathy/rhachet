import type { RoleRegistryManifest } from '@src/domain.objects';
import type { ActorDeclared } from '@src/domain.objects/ActorDeclared';
import type { HasPackageRoot } from '@src/domain.operations/config/ContextConfigOfUsage';

import type { GetPublishedActor } from './getActorExpanded';
import { getActorsPublishedOfPackage } from './getActorsPublishedOfPackage';

/**
 * .what = the published-actor lookup over the installed role packages
 * .why = `'@<repo>/<slug>'` expands from the installed package version, so a base that grows
 *        reaches every extension at the next prepare (A3)
 *
 * .note = each package's actors are read once, on the first lookup into it
 */
export const genGetPublishedActorOfPackages = (input: {
  manifests: HasPackageRoot<RoleRegistryManifest>[];
}): GetPublishedActor => {
  const actorsByRepo = new Map<string, ActorDeclared[]>();
  return ({ repo, slug }) => {
    // find the installed package for the repo; absent → no actor
    const manifest = input.manifests.find((one) => one.slug === repo);
    if (!manifest) return null;

    // read its published actors once, then look the slug up
    const actors =
      actorsByRepo.get(repo) ??
      getActorsPublishedOfPackage({ packageRoot: manifest.packageRoot });
    actorsByRepo.set(repo, actors);
    return actors.find((one) => one.slug === slug) ?? null;
  };
};
