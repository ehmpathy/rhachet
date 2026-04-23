import { BadRequestError } from 'helpful-errors';

import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack';

import { isValidKeyrackEnv, KEYRACK_VALID_ENVS } from './constants';
import { inferKeyrackEnvForSet } from './inferKeyrackEnvForSet';

export const asResolvedEnvForSet = (input: {
  env: string | undefined;
  key: string;
  manifest: KeyrackRepoManifest | null;
}): string => {
  if (input.env) {
    if (!isValidKeyrackEnv(input.env)) {
      throw new BadRequestError(
        `invalid --env: must be one of ${KEYRACK_VALID_ENVS.join(', ')}`,
      );
    }
    return input.env;
  }
  return inferKeyrackEnvForSet({ key: input.key, manifest: input.manifest });
};
