import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import type { KeyrackHostVaultAdapter } from '@src/domain.objects/keyrack';

import { inferKeyrackMechForSet } from './inferKeyrackMechForSet';

/**
 * .what = unit test for mech inference + the no-TTY guard
 * .why = aws.params exists for unattended bootstrap, so a multi-mech `set` with no --mech must
 *        NEVER block on an interactive prompt when stdin is not a terminal — it must fail loud
 */
describe('inferKeyrackMechForSet', () => {
  // narrow fixtures: only mechs.supported is read by the unit under test
  const vaultOneMech = {
    mechs: { supported: ['PERMANENT_VIA_REFERENCE'] },
  } as unknown as KeyrackHostVaultAdapter;
  const vaultTwoMech = {
    mechs: {
      supported: ['PERMANENT_VIA_REFERENCE', 'EPHEMERAL_VIA_GITHUB_APP'],
    },
  } as unknown as KeyrackHostVaultAdapter;

  // isTTY may be a read-only getter (when stdin is a real terminal) or a plain assignable
  // property (when piped), per the host — so stub it via defineProperty, which holds
  // regardless of the extant descriptor. a direct `= false` throws when isTTY is read-only.
  const setStdinIsTTY = (value: boolean | undefined): void => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value,
      configurable: true,
      writable: true,
    });
  };

  // restore the real isTTY after each case so tests do not leak the stub
  const isTTYReal = process.stdin.isTTY;
  afterEach(() => {
    setStdinIsTTY(isTTYReal);
  });

  given('[case1] a single-mech vault', () => {
    when('[t0] inferred with no TTY', () => {
      then('it auto-selects the one mech without any prompt', async () => {
        setStdinIsTTY(false);
        const mech = await inferKeyrackMechForSet({ vault: vaultOneMech });
        expect(mech).toEqual('PERMANENT_VIA_REFERENCE');
      });
    });
  });

  given('[case2] a multi-mech vault with no TTY', () => {
    when('[t0] inferred', () => {
      then(
        'it fails loud (ConstraintError) instead of a blocked prompt',
        async () => {
          setStdinIsTTY(false);
          let caught: unknown;
          try {
            await inferKeyrackMechForSet({ vault: vaultTwoMech });
          } catch (error) {
            caught = error;
          }
          expect(caught).toBeInstanceOf(ConstraintError);
        },
      );

      then(
        'the error names --mech with the supported options as the fix',
        async () => {
          setStdinIsTTY(false);
          let message = '';
          try {
            await inferKeyrackMechForSet({ vault: vaultTwoMech });
          } catch (error) {
            message = error instanceof Error ? error.message : String(error);
          }
          expect(message).toContain('stdin is not a terminal');
        },
      );
    });
  });
});
