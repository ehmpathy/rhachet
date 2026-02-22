import { BadRequestError } from 'helpful-errors';

import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack';

/**
 * .what = fail fast if --org does not match the manifest org
 * .why = prevent cross-org credential configuration
 */
export const assertKeyrackOrgMatchesManifest = (input: {
  manifest: KeyrackRepoManifest;
  org: string;
}): string => {
  // @this resolves to manifest org
  if (input.org === '@this') return input.manifest.org;

  // exact match passes
  if (input.org === input.manifest.org) return input.org;

  // mismatch
  throw new BadRequestError(
    `org "${input.org}" does not match keyrack.yml org "${input.manifest.org}"`,
    { orgProvided: input.org, orgExpected: input.manifest.org },
  );
};
