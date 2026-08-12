import { given, then, when } from 'test-fns';

import { KeyrackKeyHost } from '@src/domain.objects/keyrack/KeyrackKeyHost';
import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';

import { getOneKeyrackHostForSlugAtReach } from './getOneKeyrackHostForSlugAtReach';

/**
 * .what = the two-shot host lookup: the slug as asked, then its env=all twin
 * .why = the fallback is where a reach can silently go absent, and an absent reach means a
 *        credential for the WRONG REACH handed back as if it were right. so the case
 *        that matters most is the one that proves the reach rides across the fallback
 */

const genHost = (input: { slug: string; env: string }): KeyrackKeyHost =>
  new KeyrackKeyHost({
    slug: input.slug,
    exid: null,
    vault: 'os.direct',
    mech: 'PERMANENT_VIA_REPLICA',
    env: input.env,
    org: 'testorg',
    meta: {},
    maxDuration: null,
    createdAt: '2026-08-04T00:00:00Z',
    updatedAt: '2026-08-04T00:00:00Z',
  });

describe('getOneKeyrackHostForSlugAtReach', () => {
  given('[case1] a reachless key declared at its own env', () => {
    const hosts = { 'testorg.test.KEY': genHost({ slug: 'KEY', env: 'test' }) };

    when('[t0] asked for that slug with no reach', () => {
      then('it answers under the slug as asked', () => {
        const found = getOneKeyrackHostForSlugAtReach({
          hosts,
          slug: 'testorg.test.KEY',
        });
        expect(found?.effectiveSlug).toEqual('testorg.test.KEY');
      });
    });

    when('[t1] asked for that slug WITH a reach', () => {
      // e6 in miniature: a reach-key that was never cut does not exist, so the reachless
      // peer beside it must NOT answer. the caller turns this null into a loud throw
      then('it answers null — the reachless peer does not stand in', () => {
        const found = getOneKeyrackHostForSlugAtReach({
          hosts,
          slug: 'testorg.test.KEY',
          reach: asKeyrackKeyReach({ exid: 'beav@ehmpathy.com' }),
        });
        expect(found).toEqual(null);
      });
    });
  });

  given('[case2] a key declared only under env=all, at a reach', () => {
    const hosts = {
      'testorg.all.KEY@beav@ehmpathy.com': genHost({ slug: 'KEY', env: 'all' }),
      // the REACHLESS env=all twin sits right beside it — this is the decoy
      'testorg.all.KEY': genHost({ slug: 'KEY', env: 'all' }),
    };

    when('[t0] asked for the env=test slug at that same reach', () => {
      then('the env=all fallback answers, and it carries the reach', () => {
        const found = getOneKeyrackHostForSlugAtReach({
          hosts,
          slug: 'testorg.test.KEY',
          reach: asKeyrackKeyReach({ exid: 'beav@ehmpathy.com' }),
        });
        expect(found?.effectiveSlug).toEqual('testorg.all.KEY');
      });
    });

    when('[t1] asked for the env=test slug at a DIFFERENT reach', () => {
      // THE clamp with teeth. under a slug-only fallback this would land on the reachless
      // `testorg.all.KEY` above and hand back a credential for a reach nobody asked
      // for — e18's failure shape, one layer below where the identity axis removed it
      then(
        'it answers null rather than fall back to the reachless twin',
        () => {
          const found = getOneKeyrackHostForSlugAtReach({
            hosts,
            slug: 'testorg.test.KEY',
            reach: asKeyrackKeyReach({ exid: 'vlad@ehmpathy.com' }),
          });
          expect(found).toEqual(null);
        },
      );
    });
  });

  given('[case3] a slug that has no env=all twin to fall back to', () => {
    when('[t0] asked for a slug already at env=all', () => {
      then('it answers null without a second shot', () => {
        const found = getOneKeyrackHostForSlugAtReach({
          hosts: {},
          slug: 'testorg.all.KEY',
        });
        expect(found).toEqual(null);
      });
    });
  });
});
