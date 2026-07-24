import { given, then, when } from 'test-fns';

import { isGhWriteConflictStderr } from './isGhWriteConflictStderr';

describe('isGhWriteConflictStderr', () => {
  given('[case1] a 409 stale-sha update conflict', () => {
    when('[t0] classified', () => {
      then('it is a write conflict', () => {
        expect(
          isGhWriteConflictStderr({ stderr: 'HTTP 409: sha does not match' }),
        ).toBe(true);
      });
    });
  });

  given('[case2] a 422 concurrent-create conflict', () => {
    when('[t0] classified', () => {
      then('it is a write conflict', () => {
        expect(
          isGhWriteConflictStderr({ stderr: 'HTTP 422: file already exists' }),
        ).toBe(true);
      });
    });
  });

  given('[case3] a transient network failure', () => {
    when('[t0] classified', () => {
      then('it is NOT a write conflict (should fail loud upstream)', () => {
        expect(
          isGhWriteConflictStderr({
            stderr: 'error: could not reach api.github.com: timeout',
          }),
        ).toBe(false);
      });
    });
  });

  given('[case4] a permission denial', () => {
    when('[t0] classified', () => {
      then('it is NOT a write conflict', () => {
        expect(isGhWriteConflictStderr({ stderr: 'HTTP 403: forbidden' })).toBe(
          false,
        );
      });
    });
  });
});
