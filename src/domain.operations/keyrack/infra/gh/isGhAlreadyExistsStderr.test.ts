import { given, then, when } from 'test-fns';

import { isGhAlreadyExistsStderr } from './isGhAlreadyExistsStderr';

describe('isGhAlreadyExistsStderr', () => {
  given('[case1] a 422 name-already-exists from a concurrent create', () => {
    when('[t0] classified', () => {
      then('it is already-exists', () => {
        expect(
          isGhAlreadyExistsStderr({ stderr: 'HTTP 422: name already exists' }),
        ).toBe(true);
      });
    });
  });

  given('[case2] a plain already-exists message', () => {
    when('[t0] classified', () => {
      then('it is already-exists', () => {
        expect(
          isGhAlreadyExistsStderr({
            stderr: 'gh: repository already exists on this account',
          }),
        ).toBe(true);
      });
    });
  });

  given('[case3] a transient network failure', () => {
    when('[t0] classified', () => {
      then('it is NOT already-exists (should fail loud upstream)', () => {
        expect(
          isGhAlreadyExistsStderr({
            stderr: 'error: could not reach api.github.com: timeout',
          }),
        ).toBe(false);
      });
    });
  });

  given('[case4] a permission denial', () => {
    when('[t0] classified', () => {
      then('it is NOT already-exists', () => {
        expect(isGhAlreadyExistsStderr({ stderr: 'HTTP 403: forbidden' })).toBe(
          false,
        );
      });
    });
  });
});
