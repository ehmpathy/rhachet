import { BadRequestError } from 'helpful-errors';

import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack';

/**
 * .what = fail fast if --env is omitted when env-specific sections exist
 * .why = prevent accidental credential mismatch from silent defaults
 */
export const assertKeyrackEnvIsSpecified = (input: {
  manifest: KeyrackRepoManifest;
  env: string | null;
}): string => {
  // if env is provided, return it
  if (input.env) return input.env;

  // if no env-specific sections, default to 'all'
  if (input.manifest.envs.length === 0) return 'all';

  // env-specific sections exist but --env was omitted
  throw new BadRequestError(
    `--env is required (keyrack.yml declares ${input.manifest.envs.join(', ')})`,
    { availableEnvs: input.manifest.envs },
  );
};
