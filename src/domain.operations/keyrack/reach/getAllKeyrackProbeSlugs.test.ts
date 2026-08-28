import { given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';

import { getAllKeyrackProbeAddresses } from './getAllKeyrackProbeAddresses';
import { getAllKeyrackProbeSlugs } from './getAllKeyrackProbeSlugs';
import { getAllKeyrackReachesForSlug } from './getAllKeyrackReachesForSlug';

describe('getAllKeyrackProbeSlugs', () => {
  given('[case1] a slug at a specific env', () => {
    when('[t0] the shots are listed', () => {
      const slugs = getAllKeyrackProbeSlugs({ slug: 'testorg.prep.MY_KEY' });

      then('the slug as asked is shot 1', () => {
        expect(slugs[0]).toEqual('testorg.prep.MY_KEY');
      });

      then('its env=all twin is shot 2', () => {
        expect(slugs[1]).toEqual('testorg.all.MY_KEY');
      });

      then('there are exactly two shots', () => {
        expect(slugs.length).toEqual(2);
      });
    });
  });

  given('[case2] a slug already declared at env=all', () => {
    when('[t0] the shots are listed', () => {
      const slugs = getAllKeyrackProbeSlugs({ slug: 'testorg.all.MY_KEY' });

      then('it yields ONE shot — a twin of itself would be a duplicate', () => {
        expect(slugs).toEqual(['testorg.all.MY_KEY']);
      });
    });
  });

  given('[case3] a machine-wide slug', () => {
    when('[t0] the shots are listed', () => {
      const slugs = getAllKeyrackProbeSlugs({ slug: '@all.prep.MY_KEY' });

      then('the slug as asked is still shot 1', () => {
        expect(slugs[0]).toEqual('@all.prep.MY_KEY');
      });
    });
  });

  /**
   * ⚠️ the reason this leaf exists at all: the LOOKUP and the ENUMERATION must walk the same
   * shots, or a bulk unlock enumerates fewer reaches than the lookup would go on to answer at.
   * the cases below hold the two against each other directly, so the agreement is clamped by a
   * test rather than promised by a comment
   */
  given('[case4] one key held at a reach under its env=all twin ONLY', () => {
    const hostManifest = genMockKeyrackHostManifest({
      hosts: {
        'testorg.all.MY_KEY@casey@ahction.com': {
          slug: 'testorg.all.MY_KEY',
          reach: { exid: 'casey@ahction.com' },
          vault: 'os.direct',
        },
      },
    });

    when('[t0] the enumeration is asked at the SPECIFIC env', () => {
      const reaches = getAllKeyrackReachesForSlug({
        hosts: hostManifest.hosts,
        slug: 'testorg.prep.MY_KEY',
      });

      then('it finds the reach held under the twin', () => {
        expect(reaches.map((reach) => reach.exid)).toEqual([
          'casey@ahction.com',
        ]);
      });
    });

    when('[t1] the lookup is asked at the SAME specific env', () => {
      const addresses = getAllKeyrackProbeAddresses({
        slug: 'testorg.prep.MY_KEY',
        reach: { exid: 'casey@ahction.com' },
      });

      then('it probes an address the manifest actually holds', () => {
        const held = addresses.filter(
          (probe) => hostManifest.hosts[probe.address],
        );
        expect(held.length).toEqual(1);
      });

      then(
        'so the enumeration never over-promises what the lookup can serve',
        () => {
          // the guarantee, stated as a comparison rather than as prose: every slug the
          // enumeration considers is a slug the lookup also probes
          const slugsEnumerated = getAllKeyrackProbeSlugs({
            slug: 'testorg.prep.MY_KEY',
          });
          expect(addresses.map((probe) => probe.slug)).toEqual(slugsEnumerated);
        },
      );
    });
  });
});
