import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack';

/**
 * .what = filter manifest keys to slugs for a specific env
 * .why = unlock and get must only operate on the requested env's keys
 *
 * .note = keys with env='all' are included for any specific env query
 */
export const getAllKeyrackSlugsForEnv = (input: {
  manifest: KeyrackRepoManifest;
  env: string;
}): string[] => {
  // env=all returns all slugs
  if (input.env === 'all') return Object.keys(input.manifest.keys);

  // filter to slugs where spec.env matches the requested env
  // note: env.all keys are already expanded to env-specific slugs via hydration
  //       so we exclude .all. slugs here to avoid duplicates
  return Object.entries(input.manifest.keys)
    .filter(([, spec]) => spec.env === input.env)
    .map(([slug]) => slug);
};
