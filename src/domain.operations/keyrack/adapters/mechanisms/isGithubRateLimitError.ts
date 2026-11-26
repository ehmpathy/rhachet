/**
 * .what = whether a github api error is a rate limit (primary or secondary)
 * .why = github answers a throttle with 403, the same status as a refused installation; a
 *        throttle must never be told its app was uninstalled
 *
 * .note = github marks a primary limit with `x-ratelimit-remaining: 0`, a secondary limit with a
 *         `retry-after` header, and both with "rate limit" in the message
 */
export const isGithubRateLimitError = (input: { error: unknown }): boolean => {
  // only an error object can carry the marks
  if (!(input.error instanceof Error)) return false;

  // the message github sends for either limit
  if (/rate limit/i.test(input.error.message)) return true;

  // the headers octokit keeps on its RequestError
  const response =
    'response' in input.error &&
    typeof input.error.response === 'object' &&
    input.error.response !== null
      ? (input.error.response as { headers?: Record<string, unknown> }) // octokit RequestError: response is typed on its own class, not on Error
      : null;
  const headers = response?.headers ?? {};
  if (String(headers['x-ratelimit-remaining']) === '0') return true;
  if (headers['retry-after'] !== undefined) return true;
  return false;
};
