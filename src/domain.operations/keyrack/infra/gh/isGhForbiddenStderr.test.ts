import { given, then, when } from 'test-fns';

import { isGhForbiddenStderr } from './isGhForbiddenStderr';

describe('isGhForbiddenStderr', () => {
  given('[case1] a 403 permission denial', () => {
    when('[t0] classified', () => {
      then('it is forbidden', () => {
        expect(
          isGhForbiddenStderr({
            stderr: 'gh: HTTP 403: Resource not accessible',
          }),
        ).toBe(true);
      });
    });
  });

  given('[case2] an org-owner message', () => {
    when('[t0] classified', () => {
      then('it is forbidden', () => {
        expect(
          isGhForbiddenStderr({
            stderr: 'The authenticated user must be an organization owner',
          }),
        ).toBe(true);
      });
    });
  });

  given('[case3] a 401 auth failure', () => {
    when('[t0] classified', () => {
      then('it is treated as a hard-permission signal', () => {
        expect(
          isGhForbiddenStderr({ stderr: 'gh: HTTP 401: Bad credentials' }),
        ).toBe(true);
      });
    });
  });

  given('[case4] a transient network failure', () => {
    when('[t0] classified', () => {
      then('it is NOT forbidden (should fail loud upstream)', () => {
        expect(
          isGhForbiddenStderr({
            stderr: 'error: could not reach api.github.com: timeout',
          }),
        ).toBe(false);
      });
    });
  });

  given('[case5] a rate-limit failure', () => {
    when('[t0] classified', () => {
      then('it is NOT forbidden', () => {
        expect(
          isGhForbiddenStderr({ stderr: 'gh: HTTP 429: rate limit exceeded' }),
        ).toBe(false);
      });
    });
  });
});
