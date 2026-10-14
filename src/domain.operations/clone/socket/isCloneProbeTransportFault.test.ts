import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { CloneSocketGoneError } from './CloneSocketGoneError';
import { CloneWireCorruptionError } from './CloneWireCorruptionError';
import { isCloneProbeTransportFault } from './isCloneProbeTransportFault';

describe('isCloneProbeTransportFault', () => {
  given('[case1] a transport fault the probe path mints', () => {
    when('[t0] each class is checked', () => {
      then('a gone socket is a transport fault', () => {
        expect(
          isCloneProbeTransportFault({
            error: new CloneSocketGoneError('no live clone'),
          }),
        ).toEqual(true);
      });

      then('a connect fault is a transport fault', () => {
        expect(
          isCloneProbeTransportFault({
            error: new ConstraintError('clone socket did not answer in time'),
          }),
        ).toEqual(true);
      });

      then('a read timeout or socket error is a transport fault', () => {
        expect(
          isCloneProbeTransportFault({
            error: new MalfunctionError('clone get read timed out'),
          }),
        ).toEqual(true);
      });
    });
  });

  given('[case2] an error outside the allowlist', () => {
    when('[t0] each is checked', () => {
      then('a wire corruption is not — it is a protocol defect', () => {
        expect(
          isCloneProbeTransportFault({
            error: new CloneWireCorruptionError('bad json on the wire'),
          }),
        ).toEqual(false);
      });

      then('a JS defect is not', () => {
        expect(
          isCloneProbeTransportFault({
            error: new TypeError('x is undefined'),
          }),
        ).toEqual(false);
      });

      then('a plain Error is not', () => {
        expect(
          isCloneProbeTransportFault({ error: new Error('an unknown fault') }),
        ).toEqual(false);
      });

      then('a non-Error value is not', () => {
        expect(isCloneProbeTransportFault({ error: 'a string' })).toEqual(
          false,
        );
      });
    });
  });
});
