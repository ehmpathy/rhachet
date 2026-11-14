import type { ActorsManifest } from '@src/domain.objects/ActorsManifest';

import { asSlugsOfActorsDeclared } from './asSlugsOfActorsDeclared';

/**
 * .what = whether an actor ref (`@<slug>`) names an actor `.agent/actors.yml` declares
 * .why = the actor form refuses an undeclared ref; one predicate owns the `@<slug>` shape
 */
export const isActorDeclared = (input: {
  manifest: ActorsManifest;
  ref: string;
}): boolean =>
  asSlugsOfActorsDeclared({ manifest: input.manifest }).some(
    (slug) => `@${slug}` === input.ref,
  );
