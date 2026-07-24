import { UnexpectedCodePathError } from 'helpful-errors';

import { isGhNotFoundStderr } from './isGhNotFoundStderr';
import type { GhRun } from './runGh';

/**
 * .what = check whether a github repo exists and is reachable by the caller
 * .why = keyrack-infra must exist before github-app installs can read the registry
 *
 * .note = returns false ONLY for a genuine 404 (absent/unreachable-to-caller repo);
 *         any other failure (network, rate limit, 500) fails loud so a caller never
 *         mistakes a transient outage for absence and recreates a repo that exists
 * .note = a private repo the caller cannot read reads as a 404 to them, which is the
 *         correct signal — they cannot use it either way
 */
export const getGhRepoExists = (
  input: { slug: string },
  context: { ghRun: GhRun },
): boolean => {
  const result = context.ghRun({
    args: ['repo', 'view', input.slug, '--json', 'name'],
  });

  // reachable → exists
  if (result.status === 0) return true;

  // non-zero exit → distinguish a genuine 404 (absent) from other failures
  if (isGhNotFoundStderr({ stderr: result.stderr })) return false;

  // any other failure (network, rate limit, gh error) → fail loud
  throw new UnexpectedCodePathError('gh repo view failed', {
    slug: input.slug,
    stderr: result.stderr,
    status: result.status,
    hint: 'check `gh auth status`; if authenticated, the api may be rate-limited or down — try again',
  });
};
