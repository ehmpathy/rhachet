import { getError, given, then, when } from 'test-fns';

import type { KeyrackKeyReach } from '@src/domain.objects/keyrack';

import { assertKeyrackReachAbsent } from './assertKeyrackReachAbsent';

/**
 * .what = binds e13 — a reach a mech cannot act on must throw, never no-op
 * .why = a silent no-op would file a credential under a reach it does not open, while
 *        the human believes they scoped it. the whole design exists to forbid that
 *
 * .note = only the REFUSED kind of mech calls this guard. a mech that mints FOR a
 *         reach (github-app) and one that carries a DECLARED reach through
 *         (replica) both honor a reach and never reach this code — see the guard's own note
 */
describe('assertKeyrackReachAbsent', () => {
  const reach: KeyrackKeyReach = { exid: 'beav@ehmpathy.com' };

  given('[case1] no reach was asked for', () => {
    when('[t0] every mech is checked', () => {
      then('e1: none throws — a reachless call takes zero new branches', () => {
        expect(() =>
          assertKeyrackReachAbsent({ mech: 'PERMANENT_VIA_REPLICA' }),
        ).not.toThrow();
        expect(() =>
          assertKeyrackReachAbsent({ mech: 'EPHEMERAL_VIA_AWS_SSO' }),
        ).not.toThrow();
        expect(() =>
          assertKeyrackReachAbsent({ mech: 'EPHEMERAL_VIA_GITHUB_APP' }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] a reach was asked for on a mech that refuses one', () => {
    when('[t0] the aws sso mech is checked', () => {
      then('e13: it throws rather than silently ignore the reach', async () => {
        const error = await getError(async () =>
          assertKeyrackReachAbsent({ reach, mech: 'EPHEMERAL_VIA_AWS_SSO' }),
        );
        expect(error.message).toContain('EPHEMERAL_VIA_AWS_SSO');
      });

      then('e13: the error echoes the exid and names both fixes', async () => {
        const error = await getError(async () =>
          assertKeyrackReachAbsent({ reach, mech: 'EPHEMERAL_VIA_AWS_SSO' }),
        );
        expect(error.message).toContain('beav@ehmpathy.com');
        expect(error.message).toContain('EPHEMERAL_VIA_GITHUB_APP');
        expect(error.message).toContain('PERMANENT_VIA_REPLICA');
      });

      /**
       * .what = binds the remedy to metadata.hint, where getKeyrackBlockedReport reads it
       * .why = a HelpfulError bakes its metadata into .message, so an assertion on .message
       *        alone passes whether the remedy sits in the prose or in the hint — it cannot
       *        tell the two apart. only a read of `metadata.hint` proves the cli renders a
       *        `hint:` leaf rather than one long wrapped `blocked:` line
       */
      then('the remedy lands in metadata.hint, not in the prose', async () => {
        const error = await getError(async () =>
          assertKeyrackReachAbsent({ reach, mech: 'EPHEMERAL_VIA_AWS_SSO' }),
        );
        const { metadata } = error as unknown as {
          metadata: { hint: string; reach: string; mech: string };
        };
        expect(metadata.hint).toContain('drop --reach beav@ehmpathy.com');
        expect(metadata.reach).toEqual('beav@ehmpathy.com');
        expect(metadata.mech).toEqual('EPHEMERAL_VIA_AWS_SSO');

        // a `;` splits the hint into its own sub-branches in the rendered tree
        expect(metadata.hint.split(';').length).toBeGreaterThan(1);
      });
    });
  });

  /**
   * .what = binds that the refusal names the mech the CALLER invoked, never the adapter's
   *         own guess at its identity
   * .why = an adapter is NOT 1:1 with a mech. the registry aliases several names onto one
   *        adapter — EPHEMERAL_VIA_GITHUB_OIDC onto the aws.sso adapter, and
   *        PERMANENT_VIA_REFERENCE / EPHEMERAL_VIA_SESSION onto the replica adapter. so an
   *        adapter that hardcoded its own name would refuse CORRECTLY and explain WRONGLY,
   *        and a human sent to debug an oidc key would be told the fault lay in sso
   * .note = the refusal itself was never at risk — this clamps the ACCURACY of the reason,
   *         which is the half a human actually acts on (rule.require.errors-name-the-fix)
   */
  given('[case4] one adapter serves two mech identities', () => {
    when('[t0] the aliased mech refuses a reach', () => {
      then('the error names the ALIAS, not the adapter it shares', async () => {
        const error = await getError(async () =>
          assertKeyrackReachAbsent({
            reach,
            mech: 'EPHEMERAL_VIA_GITHUB_OIDC',
          }),
        );
        expect(error.message).toContain('EPHEMERAL_VIA_GITHUB_OIDC');
        expect(error.message).not.toContain('EPHEMERAL_VIA_AWS_SSO');
      });
    });
  });
});
