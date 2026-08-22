import {
  BadRequestError,
  ConstraintError,
  MalfunctionError,
  UnexpectedCodePathError,
} from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { isExpectedCryptoMiss } from './isExpectedCryptoMiss';

describe('isExpectedCryptoMiss', () => {
  given(
    '[case1] a bare generic Error (an unparseable key / wrong identity)',
    () => {
      when('[t0] isExpectedCryptoMiss is called', () => {
        then('it is an expected miss — swallow (true)', () => {
          expect(
            isExpectedCryptoMiss(new Error('not a valid openssh key')),
          ).toBe(true);
        });
      });
    },
  );

  given('[case2] any rhachet-native HelpfulError', () => {
    when('[t0] isExpectedCryptoMiss is called on each subclass', () => {
      then('MalfunctionError is NOT a miss — rethrow (false)', () => {
        expect(
          isExpectedCryptoMiss(new MalfunctionError('broken crypto load')),
        ).toBe(false);
      });

      then('ConstraintError is NOT a miss — rethrow (false)', () => {
        expect(isExpectedCryptoMiss(new ConstraintError('install age'))).toBe(
          false,
        );
      });

      // the parent classes must also propagate — this is the exact gap the allowlist missed:
      // a bare BadRequestError (ConstraintError's parent) slipped through instanceof ConstraintError
      then('BadRequestError is NOT a miss — rethrow (false)', () => {
        expect(isExpectedCryptoMiss(new BadRequestError('actionable'))).toBe(
          false,
        );
      });

      then('UnexpectedCodePathError is NOT a miss — rethrow (false)', () => {
        expect(
          isExpectedCryptoMiss(new UnexpectedCodePathError('impossible')),
        ).toBe(false);
      });
    });
  });

  given('[case3] a non-Error throw', () => {
    when('[t0] isExpectedCryptoMiss is called', () => {
      then('it is NOT an expected miss — rethrow (false)', () => {
        expect(isExpectedCryptoMiss('a thrown string')).toBe(false);
      });
    });
  });
});
