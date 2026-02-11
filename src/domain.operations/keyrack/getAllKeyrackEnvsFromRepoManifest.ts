import type { KeyrackRepoManifest } from '../../domain.objects/keyrack';

/**
 * .what = derive the list of declared envs from a manifest
 * .why = error messages and cli output need to list available envs
 */
export const getAllKeyrackEnvsFromRepoManifest = (input: {
  manifest: KeyrackRepoManifest;
}): string[] => {
  return input.manifest.envs;
};
