import { getError, given, then, when } from 'test-fns';

import type { KeyrackGrantMechanism } from '@src/domain.objects/keyrack/KeyrackGrantMechanism';
import { KEYRACK_MECH_REACH_POLICY } from '@src/domain.objects/keyrack/KeyrackMechReachPolicy';
import { KEYRACK_MECH_ADAPTERS } from '@src/domain.operations/keyrack/adapters/mechanisms/getOneKeyrackMechAdapter';
import { assertKeyrackReachAbsent } from '@src/domain.operations/keyrack/reach/assertKeyrackReachAbsent';

/**
 * .what = conformance between the declared reach policy and what each adapter actually does
 * .why = `KEYRACK_MECH_REACH_POLICY` is a claim about six mechanisms. a claim no test checks
 *        is prose with a type annotation — it would drift the first time an adapter changed,
 *        and the drift would be invisible because the table would still compile
 *
 * .note = the compiler already forces COVERAGE: `Record<KeyrackGrantMechanism, …>` refuses to
 *         build if a new mech member has no entry. what the compiler cannot check is whether
 *         an entry is TRUE — that is this file's whole job
 *
 * .note = the two claims are asymmetric, deliberately:
 *           REFUSED           → the adapter MUST throw on a reach, before any i/o
 *           DERIVED/DECLARED  → the adapter must NOT throw the refusal
 *         the second is the half that catches the real regression. a mech mis-declared
 *         REFUSED would reject a legitimate reach, and the human would read "this mech
 *         mints against its own axis" about a mech that does no such thing
 *
 * .note = hermetic. every assertion here is about the guard, which fires FIRST in every
 *         adapter — before a prompt, a `gh` call, or a pem read. so no vault, no network,
 *         and no credential is touched, and a case that somehow got past the guard would
 *         fail on the absent i/o rather than pass quietly
 */
describe('mech reach policy conformance', () => {
  const mechs = Object.keys(
    KEYRACK_MECH_REACH_POLICY,
  ) as KeyrackGrantMechanism[];

  // .note = the real registry, not a hand-built map. a conformance test that assembled its
  //         own adapter table would conform to itself and prove no claim about production
  //
  // ⚠️ read the canonical constant DIRECTLY, never through `genContextKeyrackGrantGet`. that
  //    context loads the REPO's own `.agent/keyrack.yml`, whose `extends` chain resolves
  //    through the `.agent/repo=*/` symlinks into node_modules — so a context-built version
  //    of this test passes on a linked dev box and throws `extended keyrack not found` in ci,
  //    for a reason that has naught to do with reach policy. the context's `mechAdapters` IS
  //    this constant, so the direct read costs no fidelity and buys the hermeticity the
  //    header claims (rule.require.hermetic-tests)
  const adapters = KEYRACK_MECH_ADAPTERS;

  given('[case1] the declared policy table', () => {
    when('[t0] it is read against the mechanism union', () => {
      // .note = the `Record<…>` type makes an absent entry a build failure, so this asserts
      //         the other direction: an entry for a mech the union no longer holds. a stale
      //         key would sit unreachable and read as live policy
      then('every declared mech has an adapter wired for it', () => {
        for (const mech of mechs) expect(adapters[mech]).toBeDefined();
      });

      then('every policy value is one of the three kinds', () => {
        for (const mech of mechs)
          expect(['DERIVED', 'DECLARED', 'REFUSED']).toContain(
            KEYRACK_MECH_REACH_POLICY[mech],
          );
      });

      // the split is the design; a table that drifted to all-one-kind would still typecheck
      then('the table exercises all three kinds, not merely one', () => {
        const kinds = new Set(mechs.map((m) => KEYRACK_MECH_REACH_POLICY[m]));
        expect(kinds).toEqual(new Set(['DERIVED', 'DECLARED', 'REFUSED']));
      });
    });
  });

  /**
   * .note = the two halves are checked at DIFFERENT grains, and the split is forced by what
   *         each half can honestly reach:
   *
   *         REFUSED     → through the real adapter. its guard fires before any i/o, so the
   *                       whole path is exercised with no vault, prompt, or network
   *         non-REFUSED → through the guard directly. `mechAdapterReplica.acquireForSet`
   *                       calls `promptHiddenInput` and ignores the injected `question`, so
   *                       it BLOCKS ON STDIN and cannot be invoked here — three 5s timeouts
   *                       is how that was found. the claim is re-aimed at what the registry
   *                       actually buys: were such an adapter ever wired to the refusal, the
   *                       guard rejects the mismatch loudly instead of a silent refusal of a
   *                       legitimate reach
   */
  given(
    '[case2] a REFUSED mechanism asked to acquire a credential AT a reach',
    () => {
      for (const mech of mechs.filter(
        (m) => KEYRACK_MECH_REACH_POLICY[m] === 'REFUSED',
      )) {
        when(`[t0] ${mech} is handed a reach`, () => {
          // .note = the exid is deliberately a plain one, not `github://org=…`. the claim
          //         under test is only whether the REFUSAL fires, which happens first
          then('the adapter refuses it, and names its own mech', async () => {
            const found = await getError(
              adapters[mech]!.acquireForSet({
                keySlug: 'testorg.test.API_KEY',
                reach: { exid: 'beav@ehmpathy.com' },
                mech,
              }),
            );
            expect(found.message).toContain('--reach does not apply');
            // ⚠️ the mech must be the one ASKED for, not the adapter's own guess — two
            //    mechs share this adapter, so a hardcoded name is right for only one
            expect(found.message).toContain(mech);
          });
        });
      }
    },
  );

  given(
    '[case3] a mechanism that HONORS a reach, put to the refusal guard',
    () => {
      for (const mech of mechs.filter(
        (m) => KEYRACK_MECH_REACH_POLICY[m] !== 'REFUSED',
      )) {
        const policy = KEYRACK_MECH_REACH_POLICY[mech];

        when(`[t0] ${mech} (declared ${policy}) is put to the guard`, () => {
          // this is the drift that matters: a mech mis-declared REFUSED, or an adapter that
          // reached for the refusal guard by copy-paste, would silently reject a reach
          // the human legitimately asked for. the guard refuses to be that instrument
          then(
            'the guard rejects the mismatch rather than the reach',
            async () => {
              const found = await getError(
                (async () =>
                  assertKeyrackReachAbsent({
                    reach: { exid: 'beav@ehmpathy.com' },
                    mech,
                  }))(),
              );
              expect(found.message).toContain('whose reach policy is');
              expect(found.message).toContain(policy);
              // and it must NEVER hand a human the reach refusal for a mech that honors one
              expect(found.message).not.toContain('--reach does not apply');
            },
          );
        });
      }
    },
  );
});
