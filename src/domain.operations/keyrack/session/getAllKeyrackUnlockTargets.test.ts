import { given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';

import { getAllKeyrackUnlockTargets } from './getAllKeyrackUnlockTargets';

/**
 * .what = clamps the (slug, reach) targets an unlock expands to
 * .why = this is the whole of the wisher's (B) verdict: a REACHLESS ask must name each reach
 *        the rack holds, so a key cut only at reaches is reachable from a bulk unlock — while
 *        an ask that NAMES a reach stays exactly as narrow as it was
 */
describe('getAllKeyrackUnlockTargets', () => {
  const hostManifest = genMockKeyrackHostManifest({
    hosts: {
      'testorg.prep.REPO_KEY': { env: 'prep' },
      '@all.prep.BRAINS_AUTH@casey@ahction.com': {
        slug: '@all.prep.BRAINS_AUTH',
        reach: { exid: 'casey@ahction.com' },
        env: 'prep',
        org: '@all',
      },
      '@all.prep.BRAINS_AUTH@casey@ahbode.com': {
        slug: '@all.prep.BRAINS_AUTH',
        reach: { exid: 'casey@ahbode.com' },
        env: 'prep',
        org: '@all',
      },
    },
  });

  given(
    '[case1] a REACHLESS ask over a rack that holds a key at two reaches',
    () => {
      when('[t0] the targets are expanded', () => {
        // ⭐ THE (B) clamp. before enumeration this yielded ONE target per slug, so the
        //    reach-cut key had no target at all and got reported `absent`
        then(
          'the reach-cut slug gains one target per reach, plus its reachless one',
          () => {
            expect(
              getAllKeyrackUnlockTargets({
                slugs: ['@all.prep.BRAINS_AUTH'],
                hosts: hostManifest.hosts,
              }),
            ).toEqual([
              { slug: '@all.prep.BRAINS_AUTH' },
              {
                slug: '@all.prep.BRAINS_AUTH',
                reach: { exid: 'casey@ahbode.com' },
              },
              {
                slug: '@all.prep.BRAINS_AUTH',
                reach: { exid: 'casey@ahction.com' },
              },
            ]);
          },
        );

        // ⚠️ acceptance 2: a slug the rack holds reachlessly expands to exactly ONE target,
        //    byte for byte the list every extant caller already had
        then('a reachless slug still expands to exactly one target', () => {
          expect(
            getAllKeyrackUnlockTargets({
              slugs: ['testorg.prep.REPO_KEY'],
              hosts: hostManifest.hosts,
            }),
          ).toEqual([{ slug: 'testorg.prep.REPO_KEY' }]);
        });
      });
    },
  );

  given('[case2] an ask that NAMES a reach', () => {
    when('[t0] the targets are expanded', () => {
      // ⛔ a named reach must NEVER expand. the caller asked for one identity; to hand it
      //    peers would be the wrong-account leak acceptance 3 forbids outright
      then('it names exactly ONE target — that reach, and no peer', () => {
        expect(
          getAllKeyrackUnlockTargets({
            slugs: ['@all.prep.BRAINS_AUTH'],
            reach: { exid: 'casey@ahction.com' },
            hosts: hostManifest.hosts,
          }),
        ).toEqual([
          {
            slug: '@all.prep.BRAINS_AUTH',
            reach: { exid: 'casey@ahction.com' },
          },
        ]);
      });

      // ⚠️ and it does NOT verify the reach is held — an uncut reach must still reach the
      //    caller's loud refusal, never be silently dropped here (rule.forbid.failhide)
      then(
        'an UNCUT reach still yields its target, for the caller to refuse',
        () => {
          expect(
            getAllKeyrackUnlockTargets({
              slugs: ['@all.prep.BRAINS_AUTH'],
              reach: { exid: 'casey@nowhere.com' },
              hosts: hostManifest.hosts,
            }),
          ).toEqual([
            {
              slug: '@all.prep.BRAINS_AUTH',
              reach: { exid: 'casey@nowhere.com' },
            },
          ]);
        },
      );
    });
  });
});
