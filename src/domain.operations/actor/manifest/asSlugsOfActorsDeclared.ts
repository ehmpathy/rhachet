import type { ActorsManifest } from '@src/domain.objects/ActorsManifest';

/**
 * .what = the slugs `.agent/actors.yml` declares, in file order
 * .why = the drift check, the re-derive sweep and the unknown-slug hint each read this one set
 */
export const asSlugsOfActorsDeclared = (input: {
  manifest: ActorsManifest;
}): string[] => input.manifest.actor.map((actor) => actor.slug);
