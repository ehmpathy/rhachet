import { MalfunctionError } from 'helpful-errors';

import { isGithubRateLimitError } from './isGithubRateLimitError';

/**
 * .what = the transient malfunction a github-app mint fault maps to, or null when the fault is
 *         not known to be transient
 * .why = a mint github could not take now (unreached, a 5xx, a throttle) clears on a retry, so it
 *        is classed and named, and the unlock isolates it to the key's row. any other fault (a
 *        defect in our own code, a 4xx github answered) is no transient: it maps to null, and the
 *        mech rethrows it untouched, so a code bug never hides behind a network hint
 *
 * .note = the allowlist is by fact, read off octokit's RequestError:
 *         - status 500 whose cause is a TypeError: octokit's wrap of a fetch that never reached
 *           github (dns, refused, reset, timeout)
 *         - status 429, or any 5xx: github answered, and asked for a retry
 *         - a 403 that is a rate limit (`isGithubRateLimitError`)
 * .note = the http status rides in the metadata; no secret is carried
 */
export const asGithubAppMintFaultTransient = (input: {
  error: unknown;
  appId: string;
}): Error | null => {
  // only an octokit RequestError carries a status
  const status =
    input.error instanceof Error &&
    'status' in input.error &&
    typeof input.error.status === 'number'
      ? input.error.status
      : null;
  if (status === null) return null;
  const cause = input.error instanceof Error ? input.error : undefined;

  // a fetch that never reached github: octokit wraps it as a 500 whose cause is the TypeError
  // .note = measured, not assumed: `keyrack.githubApp.mint.integration` [case2] runs the real
  //         octokit in a cli process whose fetch rejects with a TypeError, as undici's does on a
  //         dns, refused, or reset fault; this branch is what renders its "could not be reached"
  const isUnreached =
    status === 500 &&
    input.error instanceof Error &&
    'cause' in input.error &&
    input.error.cause instanceof TypeError;
  if (isUnreached)
    return new MalfunctionError(
      'failed to mint github app token — github could not be reached (check that this box reaches api.github.com)',
      {
        appId: input.appId,
        hint: 'check egress, dns, and proxy to api.github.com, then retry the unlock',
        cause,
      },
    );

  // github answered, and asked for a retry: a throttle or a server fault
  const isThrottled =
    status === 429 ||
    (status === 403 && isGithubRateLimitError({ error: input.error }));
  const isServerFault = status >= 500 && status <= 599;
  if (isThrottled || isServerFault)
    return new MalfunctionError(
      `failed to mint github app token — github could not mint now (${status})`,
      {
        appId: input.appId,
        status,
        hint: isThrottled
          ? 'github throttled this app; retry the unlock once the limit resets'
          : 'github had a server fault; retry the unlock',
        cause,
      },
    );

  // any other fault is not known to be transient
  return null;
};
