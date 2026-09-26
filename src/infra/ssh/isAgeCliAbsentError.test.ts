import { BadRequestError, MalfunctionError } from 'helpful-errors';

import { AGE_CLI_ABSENT_MARKER } from './ageCliAbsentMarker';
import { isAgeCliAbsentError } from './isAgeCliAbsentError';

describe('isAgeCliAbsentError', () => {
  test('true for a BadRequestError whose message carries the marker', () => {
    const error = new BadRequestError(
      `passphrase-protected key; ${AGE_CLI_ABSENT_MARKER}:\n  apt install age`,
    );
    expect(isAgeCliAbsentError(error)).toBe(true);
  });

  test('false for a BadRequestError without the marker (a bare skip)', () => {
    const error = new BadRequestError('not an ed25519 key');
    expect(isAgeCliAbsentError(error)).toBe(false);
  });

  test('false for a non-BadRequestError, even if the text matches', () => {
    // a genuine fault must never be read as the hint — only BadRequestError is
    const error = new MalfunctionError(`${AGE_CLI_ABSENT_MARKER} somewhere`);
    expect(isAgeCliAbsentError(error)).toBe(false);
  });

  test('false for a non-error value', () => {
    expect(isAgeCliAbsentError(null)).toBe(false);
    expect(isAgeCliAbsentError('install age')).toBe(false);
  });
});
