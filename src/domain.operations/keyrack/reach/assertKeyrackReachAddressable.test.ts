import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { isKeyrackFillProbeMiss } from '../fill/isKeyrackFillProbeMiss';
import { assertKeyrackReachAddressable } from './assertKeyrackReachAddressable';

/**
 * .what = clamps the VAULT-address refusal — a vault whose storage address carries no
 *         reach must reject a reach, never file it onto a shared address
 * .why = three call sites share this guard (`os.envvar.get`, `github.secrets.set`,
 *        `github.secrets.del`), and each previously hand-rolled its own near-miss. one home
 *        is only safer than three if the home itself is clamped
 * .note = `[case4]` is the one that bites hardest: it hands the RAISED error to
 *         `isKeyrackFillProbeMiss` and asserts it reads as a MISS. `fill` unlocks each target
 *         once as a probe, to ask whether the key is already vaulted; a probe against a vault
 *         whose address holds no reach raises exactly this refusal. that is a
 *         caller-fixable setup gap, not a defect — so it must answer "not vaulted" rather
 *         than halt the fill before the key it was asked to provision is ever written
 */
describe('assertKeyrackReachAddressable', () => {
  given('[case1] no reach was asked for', () => {
    when('[t0] the guard runs', () => {
      then('it does not throw — e1, the reachless path is untouched', () => {
        expect(() =>
          assertKeyrackReachAddressable({
            vault: 'os.envvar',
            direction: 'read',
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] a reach reaches a read-side flat vault', () => {
    const reach = { exid: 'github://org=ehmpathy' };

    when('[t0] the guard runs', () => {
      then('it throws a ConstraintError — caller-fixable, exit 2', async () => {
        const error = await getError(async () =>
          assertKeyrackReachAddressable({
            reach,
            vault: 'os.envvar',
            direction: 'read',
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error).not.toBeInstanceOf(MalfunctionError);
      });

      then(
        'the message names the WRONG-REACH harm, not overwrite',
        async () => {
          // a read against a flat address yields the reachless value — e18's class. the
          // write harm is a different one, and a human debugs them differently
          const error = await getError(async () =>
            assertKeyrackReachAddressable({
              reach,
              vault: 'os.envvar',
              direction: 'read',
            }),
          );
          expect(error.message).toContain('wrong reach');
          expect(error.message).not.toContain('overwrite');
          expect(error.message).toContain('os.envvar');
        },
      );
    });
  });

  given('[case3] a reach reaches a write-side flat vault', () => {
    const reach = { exid: 'beav@ehmpathy.com' };

    when('[t0] the guard runs', () => {
      then(
        'the message names the OVERWRITE harm, not wrong-reach',
        async () => {
          const error = await getError(async () =>
            assertKeyrackReachAddressable({
              reach,
              vault: 'github.secrets',
              direction: 'write',
            }),
          );
          expect(error.message).toContain('overwrite the first');
          expect(error.message).not.toContain('wrong reach');
          expect(error.message).toContain('github.secrets');
        },
      );

      then('the exid renders verbatim — no scheme is parsed', async () => {
        const error = await getError(async () =>
          assertKeyrackReachAddressable({
            reach,
            vault: 'github.secrets',
            direction: 'write',
          }),
        );
        expect(error.message).toContain('beav@ehmpathy.com');
      });
    });
  });

  given('[case4] the pair that no compiler links', () => {
    when('[t0] the raised error meets `fill`s probe allowlist', () => {
      then('it reads as a MISS — a setup gap, never a defect', async () => {
        // .note = THIS is the clamp on the class choice, and the pair is live. `fill`
        //         unlocks each target once as a PROBE, to ask whether the key is already
        //         vaulted — and a probe against a vault whose address holds no reach
        //         raises exactly this error. a `MalfunctionError` here would halt the whole
        //         `fill` on that probe, before the key it was asked to provision was ever
        //         written. a refusal to answer is not a defect; it is the answer
        const error = await getError(async () =>
          assertKeyrackReachAddressable({
            reach: { exid: 'github://org=ehmpathy' },
            vault: 'os.envvar',
            direction: 'read',
          }),
        );
        expect(isKeyrackFillProbeMiss({ error })).toEqual(true);
      });
    });
  });
});
