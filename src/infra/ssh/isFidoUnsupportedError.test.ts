import { BadRequestError, MalfunctionError } from 'helpful-errors';

import { FIDO_UNSUPPORTED_MARKER } from './fidoUnsupportedMarker';
import { isFidoUnsupportedError } from './isFidoUnsupportedError';

describe('isFidoUnsupportedError', () => {
  test('true for a BadRequestError whose message carries the marker', () => {
    const error = new BadRequestError(
      `FIDO/hardware-token key — ${FIDO_UNSUPPORTED_MARKER}.\nfix: init with an ed25519 key`,
    );
    expect(isFidoUnsupportedError(error)).toBe(true);
  });

  test('false for a BadRequestError without the marker (a bare skip)', () => {
    const error = new BadRequestError('not an ed25519 key');
    expect(isFidoUnsupportedError(error)).toBe(false);
  });

  test('false for a non-BadRequestError, even if the text matches', () => {
    // a genuine fault must never be read as the hint — only BadRequestError is
    const error = new MalfunctionError(`${FIDO_UNSUPPORTED_MARKER} somewhere`);
    expect(isFidoUnsupportedError(error)).toBe(false);
  });

  test('false for a non-error value', () => {
    expect(isFidoUnsupportedError(null)).toBe(false);
    expect(isFidoUnsupportedError(FIDO_UNSUPPORTED_MARKER)).toBe(false);
  });
});
