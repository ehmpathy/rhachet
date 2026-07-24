import { given, then, when } from 'test-fns';

import { isGhNotFoundStderr } from './isGhNotFoundStderr';

describe('isGhNotFoundStderr', () => {
  given('[case1] a rest api 404 for an absent file', () => {
    when('[t0] classified', () => {
      then('it is not-found', () => {
        expect(isGhNotFoundStderr({ stderr: 'gh: Not Found (HTTP 404)' })).toBe(
          true,
        );
      });
    });
  });

  given('[case2] a graphql repo-view miss', () => {
    when('[t0] classified', () => {
      then('it is not-found', () => {
        expect(
          isGhNotFoundStderr({
            stderr:
              "GraphQL: Could not resolve to a Repository with the name 'org/keyrack-infra'.",
          }),
        ).toBe(true);
      });
    });
  });

  given('[case3] a transient network failure', () => {
    when('[t0] classified', () => {
      then('it is NOT not-found (should fail loud upstream)', () => {
        expect(
          isGhNotFoundStderr({
            stderr: 'error: could not reach api.github.com: timeout',
          }),
        ).toBe(false);
      });
    });
  });

  given('[case4] a rate-limit failure', () => {
    when('[t0] classified', () => {
      then('it is NOT not-found', () => {
        expect(
          isGhNotFoundStderr({ stderr: 'gh: HTTP 429: rate limit exceeded' }),
        ).toBe(false);
      });
    });
  });

  given('[case5] a 500 server error', () => {
    when('[t0] classified', () => {
      then('it is NOT not-found', () => {
        expect(
          isGhNotFoundStderr({ stderr: 'gh: HTTP 500: internal server error' }),
        ).toBe(false);
      });
    });
  });
});
