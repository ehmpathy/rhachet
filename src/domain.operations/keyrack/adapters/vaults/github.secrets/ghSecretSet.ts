import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import { execSync, spawnSync } from 'node:child_process';

/**
 * .what = validate gh cli auth status
 * .why = gh secret set requires authenticated session
 *
 * .note = checks auth first, fail-fast before gh secret operations
 */
export const validateGhAuth = (): void => {
  try {
    execSync('gh auth status', { stdio: 'pipe' });
  } catch (error) {
    throw new BadRequestError('gh auth required', {
      hint: 'run: gh auth login',
      cause: error instanceof Error ? error : undefined,
    });
  }
};

/**
 * .what = set secret into github actions secrets
 * .why = enables keyrack to push secrets to github
 *
 * .note = uses gh secret set under the hood
 * .note = secret piped via stdin to avoid it in process args
 */
export const ghSecretSet = (input: {
  name: string;
  repo: string;
  secret: string;
}): void => {
  // validate auth first
  validateGhAuth();

  // validate repo format
  if (!input.repo.includes('/')) {
    throw new BadRequestError('repo must be in owner/repo format', {
      repo: input.repo,
      hint: 'e.g., ehmpathy/rhachet',
    });
  }

  // invoke gh secret set with secret via stdin
  const result = spawnSync(
    'gh',
    ['secret', 'set', input.name, '--repo', input.repo],
    {
      input: input.secret,
      encoding: 'utf-8',
    },
  );

  // failloud on gh error
  if (result.status !== 0) {
    throw new UnexpectedCodePathError('gh secret set failed', {
      name: input.name,
      repo: input.repo,
      stderr: result.stderr,
      status: result.status,
    });
  }
};
