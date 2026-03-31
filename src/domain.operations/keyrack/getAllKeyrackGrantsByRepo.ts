import { BadRequestError } from 'helpful-errors';

import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';

import { assertKeyrackEnvIsSpecified } from './assertKeyrackEnvIsSpecified';
import type { ContextKeyrackGrantGet } from './genContextKeyrackGrantGet';
import { getAllKeyrackSlugsForEnv } from './getAllKeyrackSlugsForEnv';
import { getKeyrackKeyGrant } from './getKeyrackKeyGrant';

/**
 * .what = grant all keys for a repo from keyrack
 * .why = reusable operation for CLI and SDK repo grant flow
 *
 * .note = requires keyrack.yml manifest in repo
 * .note = uses env from manifest or explicit input
 */
export const getAllKeyrackGrantsByRepo = async (
  input: {
    env: string | null;
    allow?: { dangerous?: boolean };
  },
  context: ContextKeyrackGrantGet,
): Promise<KeyrackGrantAttempt[]> => {
  // validate manifest exists
  if (!context.repoManifest) {
    throw new BadRequestError(
      'no keyrack.yml found in repo. --for repo requires keyrack.yml',
    );
  }

  // determine env from manifest or input
  const env = assertKeyrackEnvIsSpecified({
    manifest: context.repoManifest,
    env: input.env,
  });

  // get all slugs for this env
  const slugs = getAllKeyrackSlugsForEnv({
    manifest: context.repoManifest,
    env,
  });

  // grant all keys
  return getKeyrackKeyGrant(
    {
      for: { repo: true },
      env: input.env ?? undefined,
      slugs,
      allow: input.allow,
    },
    context,
  );
};
