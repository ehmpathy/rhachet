import { given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';

import { getAllSudoSlugsForKeyAsk } from './getAllSudoSlugsForKeyAsk';

/**
 * .what = clamps that a sudo key is found whether the rack holds it reachlessly or AT A REACH
 * .why = this function had NO test at all, which is why the address-vs-slug defect could sit
 *        live in it across eight review rounds. the whole class comes from one confusion: the
 *        map's KEYS are ADDRESSES (`slug@reachExid`) while every entry ALSO carries its own
 *        `slug` field, so a reader that indexes the map with a slug can never match a reach-cut
 *        entry — and a sudo key cut at a reach was therefore WRITE-ONLY via `unlock --env sudo`
 * .note = `@all.sudo.FOO@github://org=ehmpathy` is a LEGAL address
 *         (`asKeyrackKeySlugAtReach.test.ts:84-97`), so the reach cases below are reachable
 *         states, never invented ones
 */
describe('getAllSudoSlugsForKeyAsk', () => {
  given('[case1] a sudo key the rack holds ONLY at a reach', () => {
    const hostManifest = genMockKeyrackHostManifest({
      hosts: {
        '@all.sudo.GH_TOKEN@github://org=ehmpathy': {
          slug: '@all.sudo.GH_TOKEN',
          org: '@all',
          env: 'sudo',
          reach: { exid: 'github://org=ehmpathy' },
        },
      },
    });

    // ⛔ THE CLAMP. before the repair this returned `[]` — the candidate `@all.sudo.GH_TOKEN` was
    //    tested by index into an ADDRESS-keyed map, and the only key present carries the reach,
    //    so it could never match. the caller then threw `sudo key not found`
    when('[t0] the bare key name is asked for', () => {
      then('the slug is found', () => {
        expect(
          getAllSudoSlugsForKeyAsk({
            keyAsk: 'GH_TOKEN',
            repoOrg: null,
            hostManifest,
          }),
        ).toEqual(['@all.sudo.GH_TOKEN']);
      });
    });

    // the return contract is SLUGS — the caller re-applies the asked reach per slug itself, via
    // `getOneKeyrackHostForSlugAtReach`. a reach that rode this return would pre-empt that
    when('[t1] the result is inspected', () => {
      then('it carries the SLUG, never the address', () => {
        const slugs = getAllSudoSlugsForKeyAsk({
          keyAsk: 'GH_TOKEN',
          repoOrg: null,
          hostManifest,
        });
        expect(slugs[0]).not.toContain('github://');
      });
    });

    when('[t2] the FULL ADDRESS is asked for', () => {
      // an address-shaped ask hits the shortcut, which must hand back the entry's `slug` field
      // rather than echo the address — else the address rides on as a slug
      then('it returns the entry own slug, never the address back', () => {
        expect(
          getAllSudoSlugsForKeyAsk({
            keyAsk: '@all.sudo.GH_TOKEN@github://org=ehmpathy',
            repoOrg: null,
            hostManifest,
          }),
        ).toEqual(['@all.sudo.GH_TOKEN']);
      });
    });
  });

  given('[case2] one sudo slug the rack holds at TWO reaches', () => {
    const hostManifest = genMockKeyrackHostManifest({
      hosts: {
        '@all.sudo.GH_TOKEN@github://org=ehmpathy': {
          slug: '@all.sudo.GH_TOKEN',
          org: '@all',
          env: 'sudo',
          reach: { exid: 'github://org=ehmpathy' },
        },
        '@all.sudo.GH_TOKEN@github://org=ahbode': {
          slug: '@all.sudo.GH_TOKEN',
          org: '@all',
          env: 'sudo',
          reach: { exid: 'github://org=ahbode' },
        },
      },
    });

    when('[t0] the bare key name is asked for', () => {
      // N reaches of one slug are N ADDRESSES but ONE slug. to return it twice would drive the
      // caller's loop over the same slug twice and file duplicate rows
      then('the slug comes back exactly once', () => {
        expect(
          getAllSudoSlugsForKeyAsk({
            keyAsk: 'GH_TOKEN',
            repoOrg: null,
            hostManifest,
          }),
        ).toEqual(['@all.sudo.GH_TOKEN']);
      });
    });
  });

  given('[case3] a REACHLESS rack — the regression guard', () => {
    const hostManifest = genMockKeyrackHostManifest({
      hosts: {
        'testorg.sudo.DEPLOY_KEY': { org: 'testorg', env: 'sudo' },
        '@all.sudo.GH_TOKEN': { org: '@all', env: 'sudo' },
      },
    });

    // ⚠️ every extant rack falls here: a reachless entry has `slug === address`, so the repaired
    //    read returns exactly what the old one did. this is the byte-identical clamp
    when('[t0] a key held at the repo org is asked for', () => {
      then('the org-scoped slug is found', () => {
        expect(
          getAllSudoSlugsForKeyAsk({
            keyAsk: 'DEPLOY_KEY',
            repoOrg: 'testorg',
            hostManifest,
          }),
        ).toEqual(['testorg.sudo.DEPLOY_KEY']);
      });
    });

    when('[t1] a key held only machine-wide is asked for', () => {
      then('the `@all` fallback is found', () => {
        expect(
          getAllSudoSlugsForKeyAsk({
            keyAsk: 'GH_TOKEN',
            repoOrg: 'testorg',
            hostManifest,
          }),
        ).toEqual(['@all.sudo.GH_TOKEN']);
      });
    });

    when('[t2] a key the rack does not hold is asked for', () => {
      // an absent key must stay absent — the caller turns an empty result into a loud
      // `sudo key not found`, and a repair that widened this would suppress that refusal
      then('no slug comes back', () => {
        expect(
          getAllSudoSlugsForKeyAsk({
            keyAsk: 'NEVER_CUT',
            repoOrg: 'testorg',
            hostManifest,
          }),
        ).toEqual([]);
      });
    });
  });

  given(
    '[case4] a FULL SLUG asked for, on a rack that holds it at a reach',
    () => {
      const hostManifest = genMockKeyrackHostManifest({
        hosts: {
          '@all.sudo.GH_TOKEN@github://org=ehmpathy': {
            slug: '@all.sudo.GH_TOKEN',
            org: '@all',
            env: 'sudo',
            reach: { exid: 'github://org=ehmpathy' },
          },
        },
      });

      // ⛔ THE SHAPE-VS-EXISTENCE CLAMP, and it needs BOTH halves of the repair to pass.
      //
      //    the old shape test coupled shape to existence — `includes('.') && hosts[ask]` — and the
      //    map is ADDRESS-keyed, so a reach-cut entry makes that probe miss. the full slug then read
      //    as a BARE NAME, and `{repoOrg}.sudo.` was built onto a string already carrying its own
      //    org and env: `testorg.sudo.@all.sudo.GH_TOKEN`, a doubled prefix that can never match.
      //    that is the i007 defect verbatim, on the sudo axis
      //
      // .note = the shortcut cannot save this either — it probes by address and the ask is a slug.
      //         only the `slugsHeld` read, off each entry's own `slug` field, finds it
      when('[t0] the full slug is asked for', () => {
        then('the slug is found rather than doubled into a miss', () => {
          expect(
            getAllSudoSlugsForKeyAsk({
              keyAsk: '@all.sudo.GH_TOKEN',
              repoOrg: 'testorg',
              hostManifest,
            }),
          ).toEqual(['@all.sudo.GH_TOKEN']);
        });
      });
    },
  );
});
