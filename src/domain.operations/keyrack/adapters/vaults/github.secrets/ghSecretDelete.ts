import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import { spawnSync } from 'node:child_process';
import { validateGhAuth } from './ghSecretSet';

/**
 * .what = delete secret from github actions secrets
 * .why = enables keyrack to remove secrets from github
 *
 * .note = uses gh secret delete under the hood
 */
export const ghSecretDelete = (input: { name: string; repo: string }): void => {
  // validate auth first
  validateGhAuth();

  // validate repo format
  if (!input.repo.includes('/')) {
    throw new BadRequestError('repo must be in owner/repo format', {
      repo: input.repo,
      hint: 'e.g., ehmpathy/rhachet',
    });
  }

  // invoke gh secret delete
  const result = spawnSync(
    'gh',
    ['secret', 'delete', input.name, '--repo', input.repo],
    {
      encoding: 'utf-8',
    },
  );

  // failloud on gh error
  if (result.status !== 0) {
    throw new UnexpectedCodePathError('gh secret delete failed', {
      name: input.name,
      repo: input.repo,
      stderr: result.stderr,
      status: result.status,
    });
  }
};
