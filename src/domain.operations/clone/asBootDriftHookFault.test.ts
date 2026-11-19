import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asBootDriftHookFault } from './asBootDriftHookFault';

const SERIAL = '5d1e2f3a-4b5c-4d6e-8f9a-0b1c2d3e4f5a';

describe('asBootDriftHookFault', () => {
  given('[case1] a ConstraintError met inside the hook', () => {
    when('[t0] it is recast', () => {
      const cause = new ConstraintError('a constraint the hook met');
      const fault = asBootDriftHookFault({ error: cause, serial: SERIAL });

      then(
        'it is a MalfunctionError, so the hook exits 1 and never blocks the stop',
        () => {
          expect(fault).toBeInstanceOf(MalfunctionError);
          expect(fault).not.toBeInstanceOf(ConstraintError);
        },
      );

      then(
        'it names the clone, keeps the cause, and names the hand inspect',
        () => {
          const recast = fault as MalfunctionError;
          expect(recast.message).toContain(
            'the boot drift hook could not read this clone',
          );
          expect(recast.metadata?.serial).toEqual(SERIAL);
          expect(recast.metadata?.cause).toBe(cause);
          expect(recast.metadata?.hint).toEqual(
            `inspect it by hand: rhx clone boot drift --of @:${SERIAL}`,
          );
        },
      );
    });
  });

  given('[case2] a MalfunctionError met inside the hook', () => {
    when('[t0] it passes through', () => {
      const error = new MalfunctionError('a fault the hook met');

      then('it is the same error, unchanged', () => {
        expect(asBootDriftHookFault({ error, serial: SERIAL })).toBe(error);
      });
    });
  });

  given('[case3] a plain Error, a defect', () => {
    when('[t0] it passes through', () => {
      const error = new TypeError('a defect');

      then(
        'it is the same error, unchanged, so its stack is never hidden',
        () => {
          expect(asBootDriftHookFault({ error, serial: SERIAL })).toBe(error);
        },
      );
    });
  });
});
