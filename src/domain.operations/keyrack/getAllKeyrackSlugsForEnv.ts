import type { KeyrackRepoManifest } from '../../domain.objects/keyrack';

/**
 * .what = filter manifest keys to slugs for a specific env
 * .why = unlock and get must only operate on the requested env's keys
 */
export const getAllKeyrackSlugsForEnv = (input: {
  manifest: KeyrackRepoManifest;
  env: string;
}): string[] => {
  // env=all returns all slugs
  if (input.env === 'all') return Object.keys(input.manifest.keys);

  // filter to slugs where spec.env matches
  return Object.entries(input.manifest.keys)
    .filter(([, spec]) => spec.env === input.env)
    .map(([slug]) => slug);
};
