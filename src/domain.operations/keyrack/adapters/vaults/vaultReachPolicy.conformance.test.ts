import { getError, given, then, useBeforeAll, when } from 'test-fns';

import type { KeyrackHostVault } from '@src/domain.objects/keyrack/KeyrackHostVault';
import { KEYRACK_VAULT_REACH_POLICY } from '@src/domain.objects/keyrack/KeyrackVaultReachPolicy';
import { genContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { assertKeyrackReachAddressable } from '@src/domain.operations/keyrack/reach/assertKeyrackReachAddressable';

/**
 * .what = conformance between the declared vault reach policy and what each adapter does
 * .why = `KEYRACK_VAULT_REACH_POLICY` is a claim about seven vaults. a claim no test checks is
 *        prose with a type annotation — and this exact claim already drifted once: the
 *        `KeyrackHostVaultAdapter.get` doc comment stated the invariant while `aws.config` sat
 *        exempt from it on both read paths for the whole feature (r011 @ i053)
 *
 * .note = the MECH twin of this file is `mechReachPolicy.conformance.test.ts`. the two axes are
 *         genuinely separate and neither subsumes the other: a mech decides what a credential
 *         OPENS, a vault decides whether two reaches can be told apart once FILED. a sweep
 *         of the mech table proves no claim at all about `os.direct`
 *
 * .note = the compiler already forces COVERAGE: `Record<KeyrackHostVault, …>` refuses to build
 *         if a new vault member has no entry. what the compiler cannot check is whether an
 *         entry is TRUE — that is this file's whole job
 *
 * .note = ⚠️ the ADDRESSED half is the reason this file exists. `os.direct` and `1password`
 *         thread a reach correctly today and had ZERO reach-specific coverage — so a future
 *         edit to either had no regression net. a conformance test that only swept the vaults
 *         that REFUSE would have left exactly that hole open
 *
 * .note = hermetic. every assertion is about a guard, which fires FIRST in each adapter —
 *         before a file read, a socket, an `op` shell-out, or an sso call. so no vault, no
 *         network, and no credential is touched
 */
describe('vault reach policy conformance', () => {
  const vaults = Object.keys(KEYRACK_VAULT_REACH_POLICY) as KeyrackHostVault[];

  // .note = the real registry, not a hand-built map. a conformance test that assembled its own
  //         adapter table would conform to itself and prove no claim about production
  const context = useBeforeAll(async () =>
    genContextKeyrack({ owner: null, gitroot: process.cwd() }),
  );

  /**
   * .what = the phrase unique to each refusal
   * .why = BOTH refusals open with `--reach does not apply`, so that prefix cannot tell them
   *        apart. the discriminator is the second clause, and it is the whole point of the
   *        two-guard split: an UNADDRESSABLE refusal says the vault's ADDRESS has no reach,
   *        a VIA_MECH refusal names the MECH. to hand a human the first sentence about
   *        `aws.config` would be a correct refusal with a false cause
   */
  const PHRASE = {
    unaddressable: 'its storage address carries no reach',
    viaMech: 'this mech mints against its own axis',
  } as const;

  const REACH = { exid: 'beav@ehmpathy.com' };

  given('[case1] the declared policy table', () => {
    when('[t0] it is read against the vault union', () => {
      // .note = the `Record<…>` type makes an absent entry a build failure, so this asserts the
      //         other direction: an entry for a vault the union no longer holds. a stale key
      //         would sit unreachable and read as live policy
      then('every declared vault has an adapter wired for it', () => {
        for (const vault of vaults)
          expect(context.vaultAdapters[vault]).toBeDefined();
      });

      then('every policy value is one of the three kinds', () => {
        for (const vault of vaults)
          expect(['ADDRESSED', 'UNADDRESSABLE', 'VIA_MECH']).toContain(
            KEYRACK_VAULT_REACH_POLICY[vault],
          );
      });

      // the split is the design; a table that drifted to all-one-kind would still typecheck
      then('the table exercises all three kinds, not merely one', () => {
        const kinds = new Set(vaults.map((v) => KEYRACK_VAULT_REACH_POLICY[v]));
        expect(kinds).toEqual(
          new Set(['ADDRESSED', 'UNADDRESSABLE', 'VIA_MECH']),
        );
      });
    });
  });

  /**
   * .what = the method on which an UNADDRESSABLE vault's refusal is probed
   * .why = ⚠️ a single method does NOT serve both vaults, and the first draft of this file
   *        assumed it did. `set` fails for BOTH, for two different reasons the sweep exposed:
   *          - `os.envvar.set` throws `os.envvar is read-only` FIRST, so the read-only refusal
   *            wins and the reach guard is never reached
   *          - `github.secrets.set` calls `inferKeyrackMechForSet` before its guard, which does
   *            i/o — the test timed out at 5000ms rather than assert anything
   *        so the probe is `get` where a vault has one, and `del` where it does not. that is
   *        derived from the adapter itself (a `null` get IS the write-only signal) rather than
   *        hand-coded per vault, so a new UNADDRESSABLE vault is swept with no edit here
   */
  const probeUnaddressable = (vault: KeyrackHostVault) => {
    const adapter = context.vaultAdapters[vault]!;
    return adapter.get
      ? adapter.get({ slug: 'testorg.test.API_KEY', reach: REACH })
      : // mech + meta are REQUIRED on del (null when unknown). the guard under probe fires
        // BEFORE either is read, so null keeps this hermetic and claims no thing about them
        adapter.del({
          slug: 'testorg.test.API_KEY',
          reach: REACH,
          mech: null,
          meta: null,
        });
  };

  given('[case2] an UNADDRESSABLE vault handed a reach', () => {
    for (const vault of vaults.filter(
      (v) => KEYRACK_VAULT_REACH_POLICY[v] === 'UNADDRESSABLE',
    )) {
      when(`[t0] ${vault} is handed a reach`, () => {
        then('it refuses, and names its ADDRESS as the reason', async () => {
          const found = await getError(probeUnaddressable(vault));
          expect(found.message).toContain(PHRASE.unaddressable);
          expect(found.message).toContain(vault);
          // ⚠️ never the MECH refusal — this vault's mech is not what refuses here
          expect(found.message).not.toContain(PHRASE.viaMech);
        });
      });
    }
  });

  given('[case3] a VIA_MECH vault handed a reach on READ', () => {
    for (const vault of vaults.filter(
      (v) => KEYRACK_VAULT_REACH_POLICY[v] === 'VIA_MECH',
    )) {
      when(`[t0] ${vault}.get is handed a reach`, () => {
        // this is the i053 blocker, held open. the read side had NO guard at all, so a
        // reach-ask derived the reachless sso profile — a live credential for a reach
        // the caller never named (e18's class)
        then('it refuses, and names its MECH as the reason', async () => {
          const get = context.vaultAdapters[vault]!.get;
          expect(get).not.toBeNull();

          const found = await getError(
            get!({
              slug: 'testorg.test.AWS_PROFILE',
              exid: 'testorg-test',
              reach: REACH,
            }),
          );
          expect(found.message).toContain(PHRASE.viaMech);
          // ⚠️ never the ADDRESS refusal — this vault's host entry IS addressed by composite
          //    address like any other, so that sentence would be a false explanation
          expect(found.message).not.toContain(PHRASE.unaddressable);
        });
      });
    }
  });

  given('[case4] an ADDRESSED vault handed a reach', () => {
    for (const vault of vaults.filter(
      (v) => KEYRACK_VAULT_REACH_POLICY[v] === 'ADDRESSED',
    )) {
      when(`[t0] ${vault}.get is handed a reach`, () => {
        // ⚠️ THE half r011 found uncovered. an ADDRESSED vault files two reaches at two
        //    addresses, so it must NOT reach for either refusal — a vault mis-wired to one
        //    would reject a reach the human legitimately holds, and the human would read
        //    "this vault cannot tell reaches apart" about a vault whose whole design does
        // .note = the claim is made on BOTH paths, never only the throw path: whatever the
        //         adapter does with its i/o (a null for an absent file, an unreachable daemon,
        //         an `op` that is not signed in), the one outcome forbidden is a REACH refusal
        then('it does not refuse the reach on either axis', async () => {
          const get = context.vaultAdapters[vault]!.get;
          expect(get).not.toBeNull();

          const found = await getError(
            get!({
              slug: 'testorg.test.API_KEY',
              exid: 'testorg-test',
              reach: REACH,
            }),
          );
          const message = found?.message ?? '';
          expect(message).not.toContain(PHRASE.unaddressable);
          expect(message).not.toContain(PHRASE.viaMech);
        });

        // ⚠️ the WIRE half, and it is a different claim than the one above. `[t0]` proves the
        //    adapter does not refuse today; this proves the guard would REFUSE TO REFUSE if a
        //    future edit wired this vault to it by copy-paste. absent this, a mis-wire would
        //    reject a reach the human legitimately holds, and the human would read "this
        //    vault cannot tell reaches apart" about a vault whose whole design does
        // .note = symmetric with the mech twin's `[case3]`, which makes the same claim on the
        //         mech axis. the vault axis had no equivalent until 2026-08-06 (r011 @ i055)
        when(
          `[t1] ${vault} is put to the UNADDRESSABLE guard by mistake`,
          () => {
            then(
              'the guard rejects the mis-wire, never the reach',
              async () => {
                const found = await getError(
                  (async () =>
                    assertKeyrackReachAddressable({
                      reach: REACH,
                      vault,
                      direction: 'read',
                    }))(),
                );
                expect(found.message).toContain('whose reach policy is');
                expect(found.message).toContain(
                  KEYRACK_VAULT_REACH_POLICY[vault],
                );
                // and it must NEVER hand a human the address refusal for a vault that files one
                expect(found.message).not.toContain(PHRASE.unaddressable);
              },
            );
          },
        );
      });
    }
  });
});
