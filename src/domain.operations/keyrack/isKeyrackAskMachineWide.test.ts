import { given, then, when } from 'test-fns';

import { isKeyrackAskMachineWide } from './isKeyrackAskMachineWide';

/**
 * .note = every row states BOTH dimensions, `for` and `org`, even where one is null. that is
 *         the input contract (rule.forbid.undefined-inputs), and it also reads better here: a
 *         row that omitted `for` would leave a reader unable to tell "no keys named" apart
 *         from "this row does not care"
 */
describe('isKeyrackAskMachineWide', () => {
  given('[case1] an explicit --org', () => {
    when('[t0] org is @all', () => {
      then('the ask is machine-wide', () => {
        expect(isKeyrackAskMachineWide({ for: null, org: '@all' })).toEqual(
          true,
        );
      });
    });

    when('[t1] org is a real org', () => {
      then('the ask is not machine-wide', () => {
        expect(isKeyrackAskMachineWide({ for: null, org: 'ehmpathy' })).toEqual(
          false,
        );
      });
    });
  });

  given('[case2] an ask with NO org — the two-surface asymmetry', () => {
    // .why = the cli defaults --org to '@this'; the sdk declares org?: string with no default.
    //        so ONE logical ask arrives spelled two ways. a predicate phrased negatively
    //        (org !== '@this') reads the sdk's absent org as machine-wide, which would skip the
    //        manifest for every sdk ask that omits org and disable ORG_MISMATCH wholesale
    when(
      '[t0] org is null (the sdk surface, normalized at the boundary)',
      () => {
        then('the ask is not machine-wide', () => {
          expect(isKeyrackAskMachineWide({ for: null, org: null })).toEqual(
            false,
          );
        });
      },
    );

    when('[t1] org is @this (the cli default)', () => {
      then('the ask is not machine-wide', () => {
        expect(isKeyrackAskMachineWide({ for: null, org: '@this' })).toEqual(
          false,
        );
      });
    });
  });

  given('[case3] the org derived from the keys', () => {
    when('[t0] every key is machine-wide', () => {
      then('the ask is machine-wide', () => {
        expect(
          isKeyrackAskMachineWide({
            for: { keys: ['@all.camp.GITHUB_TOKEN', '@all.camp.OTHER'] },
            org: null,
          }),
        ).toEqual(true);
      });
    });

    when('[t1] a MIXED ask — one machine-wide key, one repo key', () => {
      // .why = the union is strict. any member that needs the manifest wins, so the load
      //        must still run. a per-key decision would move the repo member's provenance
      //        check from the upfront ORG_MISMATCH guard to a downstream collision assert
      then('the ask is not machine-wide', () => {
        expect(
          isKeyrackAskMachineWide({
            for: { keys: ['@all.camp.GITHUB_TOKEN', 'MY_KEY'] },
            org: null,
          }),
        ).toEqual(false);
      });
    });

    when('[t2] a bare key name', () => {
      then('the ask is not machine-wide', () => {
        expect(
          isKeyrackAskMachineWide({ for: { keys: ['MY_KEY'] }, org: null }),
        ).toEqual(false);
      });
    });

    when('[t3] an empty key list', () => {
      then('the ask is not machine-wide', () => {
        expect(
          isKeyrackAskMachineWide({ for: { keys: [] }, org: null }),
        ).toEqual(false);
      });
    });
  });

  given('[case4] the repo selector', () => {
    // .why = getAllKeyrackGrantsByRepo throws ConstraintError('no keyrack.yml found in repo')
    //        on a null manifest. so a `true` here would emit that message INSIDE a repo that
    //        has one — a lie. the selector check is unconditional, never derived from keys
    when('[t0] --for repo', () => {
      then('the ask is not machine-wide', () => {
        expect(
          isKeyrackAskMachineWide({ for: { repo: true }, org: null }),
        ).toEqual(false);
      });
    });

    when('[t1] --for repo WITH an explicit --org @all', () => {
      // .why = the repo check is UNCONDITIONAL, ahead of the explicit org. a repo sweep's
      //        members come from the manifest, so this ask needs it whatever the flag says
      then('the ask is still not machine-wide', () => {
        expect(
          isKeyrackAskMachineWide({ for: { repo: true }, org: '@all' }),
        ).toEqual(false);
      });
    });
  });

  given('[case5] a full @all slug together with an --org flag', () => {
    // .why = a full slug is SELF-DECLARED, so its org segment outranks --org. that mirrors
    //        the read: asKeyrackKeySlug.ts decodes a full slug from `parsed.org` alone,
    //        never consults --org, and exempts `@all` from ORG_MISMATCH
    //
    // .note = [t0] is the row that matters most. the cli defaults --org to '@this'
    //         (the `get` verb in invokeKeyrack.ts), and that default is INDISTINGUISHABLE
    //         from a human who typed it. so without this precedence a bare
    //         `keyrack get --key @all.camp.FOO`
    //         reads as repo-scoped and loads the very manifest it never consults — the
    //         reported defect, merely relocated one layer up
    when('[t0] the cli @this default rides along — THE GUARD', () => {
      then('the slug still wins, so the ask is machine-wide', () => {
        expect(
          isKeyrackAskMachineWide({
            for: { keys: ['@all.camp.GITHUB_TOKEN'] },
            org: '@this',
          }),
        ).toEqual(true);
      });
    });

    when('[t1] a real org rides along', () => {
      then('the slug still wins, as the verbatim read does', () => {
        expect(
          isKeyrackAskMachineWide({
            for: { keys: ['@all.camp.GITHUB_TOKEN'] },
            org: 'ehmpathy',
          }),
        ).toEqual(true);
      });
    });

    when('[t2] a BARE key with --org @all', () => {
      // .why = the mirror row. a bare key carries no sigil of its own, so the flag is the
      //        only statement of provenance there is — it must still be honored
      then('the flag speaks, so the ask is machine-wide', () => {
        expect(
          isKeyrackAskMachineWide({
            for: { keys: ['GITHUB_TOKEN'] },
            org: '@all',
          }),
        ).toEqual(true);
      });
    });

    when('[t3] a MIXED ask WITH --org @all', () => {
      // .why = the strict union governs the DERIVED case, where a bare key's org must come
      //        from the manifest. an explicit `--org @all` is a different statement: it
      //        declares provenance for every bare member, so `MY_KEY` reads as
      //        `@all.<env>.MY_KEY` and no member needs the manifest after all
      then('the flag speaks for the bare member too', () => {
        expect(
          isKeyrackAskMachineWide({
            for: { keys: ['@all.camp.GITHUB_TOKEN', 'MY_KEY'] },
            org: '@all',
          }),
        ).toEqual(true);
      });
    });

    when('[t4] a REAL-ORG full slug rides along with --org @all', () => {
      // ⚠️ .why = THE SECURITY ROW. a flag cannot waive a check it is not an input to.
      //         `ehmpathy.prep.OTHER` names its own org, and asKeyrackKeySlug.ts compares
      //         THAT segment against the manifest's — it never reads `--org`. so were this
      //         `true`, the load would be skipped and the ORG_MISMATCH guard for the repo-bound
      //         member would never run: the overstatement hazard, whose cost is a silently
      //         wrong answer rather than a wasted load (1.vision e1/e3)
      // .note = the mirror of [t3]. there the second member is a BARE key, which names no org
      //         and so genuinely defers to the flag. here it NAMES one, and a named org is a
      //         claim the manifest must check. the difference is what the key states, never
      //         what the flag states
      then('the strict union wins — the flag cannot waive ORG_MISMATCH', () => {
        expect(
          isKeyrackAskMachineWide({
            for: { keys: ['@all.camp.GITHUB_TOKEN', 'ehmpathy.prep.OTHER'] },
            org: '@all',
          }),
        ).toEqual(false);
      });
    });

    when('[t5] that same mixed ask with NO org named', () => {
      // .why = the mirror of [t4], and the row that proves the flag is what did the work there.
      //        with no explicit org the derivation runs, one member is not machine-wide, and
      //        the strict union holds — the manifest loads and ORG_MISMATCH guards it
      then('the strict union holds, so the ask is not machine-wide', () => {
        expect(
          isKeyrackAskMachineWide({
            for: { keys: ['@all.camp.GITHUB_TOKEN', 'ehmpathy.prep.OTHER'] },
            org: null,
          }),
        ).toEqual(false);
      });
    });
  });
});
