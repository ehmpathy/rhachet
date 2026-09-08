import { given, then, when } from 'test-fns';

import { asKeyrackAskOrg } from './asKeyrackAskOrg';

/**
 * .what = the unit for the cast itself, distinct from isKeyrackAskMachineWide's unit
 * .why = the ONE consumer collapses this cast's whole range to `=== '@all'`, so three of its
 *        output classes ('@all', a real org, null) become two ('@all', not) before any extant
 *        assertion sees them. a swap of `null` for `'ehmpathy'` — or the reverse — is invisible
 *        to every other test in the suite. these rows pin the range the wrapper cannot express
 */
describe('asKeyrackAskOrg', () => {
  given('[case1] the machine-wide answer — the ONE contracted return', () => {
    when('[t0] an explicit --org @all', () => {
      then('the cast reads @all', () => {
        expect(asKeyrackAskOrg({ for: null, org: '@all' })).toEqual('@all');
      });
    });

    when('[t1] a full @all slug, with no org named', () => {
      then('the slug alone yields @all', () => {
        expect(
          asKeyrackAskOrg({
            for: { keys: ['@all.camp.GITHUB_TOKEN'] },
            org: null,
          }),
        ).toEqual('@all');
      });
    });
  });

  given('[case2] the absent answer — null, never an empty string', () => {
    // .why = null is the honest absence (rule.forbid.undefined-attributes). the vision sketched
    //        a `string` return; '' would be a magic value a caller could mistake for an org name
    when('[t0] an ask that names neither a flag nor a key', () => {
      then('the cast reads null', () => {
        expect(asKeyrackAskOrg({ for: null, org: null })).toEqual(null);
      });
    });

    when('[t1] an empty key list', () => {
      then('the cast reads null — an empty set states no org', () => {
        expect(asKeyrackAskOrg({ for: { keys: [] }, org: null })).toEqual(null);
      });
    });

    when('[t2] a repo sweep WITH an explicit --org @all', () => {
      // .why = the repo selector is unconditional and precedes the flag, so this must be null
      //        rather than '@all'. the boolean wrapper reports `false` for BOTH null and a real
      //        org, so only this row can tell which one the repo branch actually returns
      then('the repo selector wins, and it wins by null', () => {
        expect(asKeyrackAskOrg({ for: { repo: true }, org: '@all' })).toEqual(
          null,
        );
      });
    });
  });

  given('[case3] the uncontracted answer — a real org, passed through', () => {
    when('[t0] an explicit --org names a real org', () => {
      then('the cast passes it through verbatim', () => {
        expect(asKeyrackAskOrg({ for: null, org: 'ehmpathy' })).toEqual(
          'ehmpathy',
        );
      });
    });

    when('[t1] a REAL-ORG full slug rides along with --org @this', () => {
      // .why = THE ROW THIS FILE EXISTS FOR. the flag wins here, NOT the self-declared org in
      //        the slug — the slug-outranks-flag precedence is applied for the `@all` segment
      //        only, and that narrowness is deliberate (see the cast's last .note). both
      //        answers are manifest-bound (the vision's e3), and the one consumer collapses
      //        both to the same `false`, so to generalize the precedence would add a code path
      //        with no reader. pinned so the narrowness reads as a choice, never an oversight
      then(
        'the cast reads @this, and does NOT derive ehmpathy from the slug',
        () => {
          expect(
            asKeyrackAskOrg({
              for: { keys: ['ehmpathy.prep.FOO'] },
              org: '@this',
            }),
          ).toEqual('@this');
        },
      );
    });

    when('[t2] a bare key with a real --org', () => {
      then('the flag is the only statement of provenance, so it speaks', () => {
        expect(
          asKeyrackAskOrg({ for: { keys: ['MY_KEY'] }, org: 'ehmpathy' }),
        ).toEqual('ehmpathy');
      });
    });
  });

  given(
    '[case4] the strict union, read at the cast rather than the boolean',
    () => {
      when('[t0] a mixed ask with NO org named', () => {
        // .why = the boolean says `false`; this says WHICH non-@all answer. null, not a derived
        //        repo org — the cast declines to guess an org the manifest alone can supply
        then('the cast reads null', () => {
          expect(
            asKeyrackAskOrg({
              for: { keys: ['@all.camp.GITHUB_TOKEN', 'MY_KEY'] },
              org: null,
            }),
          ).toEqual(null);
        });
      });

      when('[t1] that same mixed ask WITH an explicit --org @all', () => {
        then('the explicit flag outranks the derived strictness', () => {
          expect(
            asKeyrackAskOrg({
              for: { keys: ['@all.camp.GITHUB_TOKEN', 'MY_KEY'] },
              org: '@all',
            }),
          ).toEqual('@all');
        });
      });
    },
  );

  given('[case5] a key whose org IS the sigil but whose env is invalid', () => {
    // ⚠️ .why = THE OVERSTATEMENT ROW. `@all.badenv.FOO` is not a full slug — the codebase's own
    //        validated decode rejects the env, so it is a bare key NAME that happens to hold
    //        dots. read as machine-wide, this cast returns '@all', the manifest load is SKIPPED,
    //        and the read then reports "add keyrack.yml to repo" from inside a repo that HAS
    //        one. the cost is a WRONG ANSWER, never a wasted load — the asymmetry the vision
    //        names, and the reason the two predicates had to share one parser

    when('[t0] the cli default rides along (--org @this)', () => {
      then('the cast reads @this, so the manifest still loads', () => {
        expect(
          asKeyrackAskOrg({
            for: { keys: ['@all.badenv.FOO'] },
            org: '@this',
          }),
        ).toEqual('@this');
      });
    });

    when('[t1] no org is named at all', () => {
      then('the cast reads null — a bare key states no provenance', () => {
        expect(
          asKeyrackAskOrg({ for: { keys: ['@all.badenv.FOO'] }, org: null }),
        ).toEqual(null);
      });
    });

    when('[t2] the caller explicitly names --org @all', () => {
      // .why = the flag is the caller's own statement, and a bare key defers to it. so an
      //        explicit `@all` IS honored here — what the fix removes is the SILENT read of a
      //        malformed key as machine-wide, never a caller's deliberate one
      then('the explicit flag speaks', () => {
        expect(
          asKeyrackAskOrg({ for: { keys: ['@all.badenv.FOO'] }, org: '@all' }),
        ).toEqual('@all');
      });
    });
  });
});
