import { given, then, when } from 'test-fns';

import { isGithubRateLimitError } from './isGithubRateLimitError';

/**
 * .what = an error shaped as octokit's RequestError: a message, and the response headers
 */
const asRequestError = (input: {
  message: string;
  headers: Record<string, unknown>;
}): Error =>
  Object.assign(new Error(input.message), {
    response: { headers: input.headers },
  });

const TEST_CASES = [
  {
    description: 'a message that names a rate limit',
    given: {
      error: asRequestError({
        message: 'API rate limit exceeded',
        headers: {},
      }),
    },
    expect: { isRateLimit: true },
  },
  {
    description: 'a primary limit: x-ratelimit-remaining is 0',
    given: {
      error: asRequestError({
        message: 'Forbidden',
        headers: { 'x-ratelimit-remaining': '0' },
      }),
    },
    expect: { isRateLimit: true },
  },
  {
    description: 'a secondary limit: a retry-after header',
    given: {
      error: asRequestError({
        message: 'Forbidden',
        headers: { 'retry-after': '60' },
      }),
    },
    expect: { isRateLimit: true },
  },
  {
    description: 'a 403 for a refused installation: no limit marks',
    given: {
      error: asRequestError({
        message: 'Resource not accessible by integration',
        headers: { 'x-ratelimit-remaining': '4999' },
      }),
    },
    expect: { isRateLimit: false },
  },
  {
    description: 'an error with no response at all',
    given: { error: new Error('Forbidden') },
    expect: { isRateLimit: false },
  },
  {
    description: 'a value that is not an error',
    given: { error: 'rate limit' },
    expect: { isRateLimit: false },
  },
];

describe('isGithubRateLimitError', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the error is read', () => {
        then(`it reads ${thisCase.expect.isRateLimit}`, () => {
          expect(
            isGithubRateLimitError({ error: thisCase.given.error }),
          ).toEqual(thisCase.expect.isRateLimit);
        });
      });
    }),
  );
});
