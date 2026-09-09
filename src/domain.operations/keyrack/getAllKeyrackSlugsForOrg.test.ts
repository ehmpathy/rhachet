import { given, then, when } from 'test-fns';

import { getAllKeyrackSlugsForOrg } from './getAllKeyrackSlugsForOrg';

/**
 * .what = the unit clamp for the one org-segment narrow every sweep verb shares
 * .why = `unlock`, `list`, `status`, and `source` all narrow on provenance. one operation is
 *        what keeps four verbs from four subtly different reads of "the org segment"
 */
describe('getAllKeyrackSlugsForOrg', () => {
  const slugs = [
    '@all.camp.MACHINE_KEY',
    'testorg.camp.REPO_KEY',
    'otherorg.prep.THEIR_KEY',
    '@allstar.prep.LOOKALIKE',
    'testorg.all.ENV_ALL_KEY',
  ];

  given('[case1] no filter', () => {
    when('[t0] the org is null', () => {
      // ⚠️ .why = THE DEFAULT ROW. null means NO filter, never an empty result. this is what
      //         makes `--org` additive — a caller who passes none sees the extant scope
      then('every slug stands', () => {
        expect(getAllKeyrackSlugsForOrg({ slugs, org: null })).toEqual(slugs);
      });
    });
  });

  given(
    '[case6] a REACH-CUT key, whose host-manifest map key is an ADDRESS',
    () => {
      // ⚠️ .why = the merge clamp. on THIS tree `getAllMachineWideSlugsForEnv` returns the host
      //        map's KEYS, and a reach-cut key is keyed by its ADDRESS (`slug@reachExid`) rather
      //        than its slug — the exact read `origin/main` 6f4128d (#485) repairs upstream. so
      //        until that merge lands, an address flows into THIS filter, and the open question
      //        is whether the filter silently DROPS it
      // ⚠️ .why.answer = it does not, and the reason is worth a record: this decoder splits on
      //        `.`, never on `@`. an address's `@` lands inside the KEY-NAME segment, which is
      //        `parts.slice(2).join('.')` — a segment with no shape rule at all. so the org
      //        segment still reads `@all` and the row survives the narrow
      // ⚠️ .why.clamp = this row exists so the answer stops resting on a reader's trace of two
      //        operations across an unlanded merge. whichever way #485 lands, this stays true or
      //        goes red — and a silent drop of a machine-wide credential is a failure a human
      //        would read as "the key is not on this box"
      const slugsWithAddress = [
        '@all.camp.GITHUB_TOKEN@bot@example.com', // an exid that holds BOTH @ and .
        '@all.camp.PLAIN_TOKEN',
        'testorg.camp.REPO_KEY',
      ];

      when('[t0] the machine-wide filter is applied', () => {
        then(
          'the reach-cut row SURVIVES — an @ never breaks the org read',
          () => {
            expect(
              getAllKeyrackSlugsForOrg({
                slugs: slugsWithAddress,
                org: '@all',
              }),
            ).toEqual([
              '@all.camp.GITHUB_TOKEN@bot@example.com',
              '@all.camp.PLAIN_TOKEN',
            ]);
          },
        );
      });

      when('[t1] a repo-org filter is applied', () => {
        then(
          'the machine-wide addresses are excluded, as any @all row is',
          () => {
            expect(
              getAllKeyrackSlugsForOrg({
                slugs: slugsWithAddress,
                org: 'testorg',
              }),
            ).toEqual(['testorg.camp.REPO_KEY']);
          },
        );
      });
    },
  );

  given('[case2] the machine-wide filter', () => {
    when('[t0] the org is @all', () => {
      then('only the @all slug is kept', () => {
        expect(getAllKeyrackSlugsForOrg({ slugs, org: '@all' })).toEqual([
          '@all.camp.MACHINE_KEY',
        ]);
      });
    });

    when('[t1] a LOOKALIKE org rides along', () => {
      // ⚠️ .why = `@allstar` starts with the letters `@all`, so a `startsWith` read would keep
      //         it and hand a real org's credential to a machine-wide ask. the test is the
      //         SEGMENT, exactly — [t0] above is what proves it, since @allstar is absent there
      then('it is NOT read as machine-wide', () => {
        expect(getAllKeyrackSlugsForOrg({ slugs, org: '@all' })).not.toContain(
          '@allstar.prep.LOOKALIKE',
        );
      });
    });
  });

  given('[case3] a literal org filter', () => {
    when('[t0] the org is this repo', () => {
      // .note = `testorg.all.ENV_ALL_KEY` IS kept — `env.all` is a different axis of the slug,
      //         and its ORG segment is `testorg` like any other
      then('every slug of that org is kept, across envs', () => {
        expect(getAllKeyrackSlugsForOrg({ slugs, org: 'testorg' })).toEqual([
          'testorg.camp.REPO_KEY',
          'testorg.all.ENV_ALL_KEY',
        ]);
      });
    });

    when('[t1] the org matches no slug', () => {
      then('the result is empty — an honest answer, not a fallback', () => {
        expect(getAllKeyrackSlugsForOrg({ slugs, org: 'nobody' })).toEqual([]);
      });
    });
  });

  /**
   * ⚠️ .why = THE ONE-PARSER CLAMP. this filter and `asKeyrackSlugOrgKind` answer the same
   *        question — "what org does this slug carry?" — for the same string. built on two
   *        different parsers they DISAGREE on a slug whose middle segment is not a valid env,
   *        and the disagreement is silent: one verb family keeps the slug under `--org @all`
   *        while every keyed verb reads it as a bare key that is not machine-wide
   * .note = every row above stays GREEN under a naive `split('.')[0]`, because each of their
   *        slugs is well-formed. this case is the only one with teeth on the parser choice
   *        (rule.require.clamp-edge-cases)
   */
  given('[case4] a dotted key whose middle segment is NOT a valid env', () => {
    const malformed = [
      '@all.badenv.FOO', // reads as org `@all` to a naive split; a BARE key to the decoder
      'my.api.KEY', // the same shape without the sigil
      'BARE_KEY', // no dots at all
      '@all.camp.REAL', // the control — a well-formed machine-wide slug
    ];

    when('[t0] the set is narrowed to @all', () => {
      then('only the WELL-FORMED machine-wide slug is kept', () => {
        expect(
          getAllKeyrackSlugsForOrg({ slugs: malformed, org: '@all' }),
        ).toEqual(['@all.camp.REAL']);
      });

      then('a key that names no valid env is not read as machine-wide', () => {
        expect(
          getAllKeyrackSlugsForOrg({ slugs: malformed, org: '@all' }),
        ).not.toContain('@all.badenv.FOO');
      });
    });

    when(
      "[t1] the set is narrowed to a bare key's first dotted segment",
      () => {
        // ⚠️ .why = a bare key NAMES no org, so no org filter may claim it. a naive split would
        //         report `my` as this key's org and hand it to an `--org my` sweep
        then('a bare dotted key is claimed by no org', () => {
          expect(
            getAllKeyrackSlugsForOrg({ slugs: malformed, org: 'my' }),
          ).toEqual([]);
        });
      },
    );
  });
});
