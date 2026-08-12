import { given, then, when } from 'test-fns';

import { getAllKeyrackProbeAddresses } from './getAllKeyrackProbeAddresses';

/**
 * .what = the ordered probe addresses for one key at one reach
 * .why = this operation now carries the reach axis's most safety-critical invariant for all
 *        three of its lookups. it was three hand-written copies; a single home earns its
 *        keep only if a single test guards it
 *
 * .note = the load-bearing case is `[case2]` — the env=all fallback AT A REACH. that is the
 *         one a slug-only fallback gets wrong, and to get it wrong is to hand back a
 *         credential for a reach nobody asked for (e18)
 */
describe('getAllKeyrackProbeAddresses', () => {
  given('[case1] a reachless key', () => {
    when('[t0] its probe addresses are listed', () => {
      const found = getAllKeyrackProbeAddresses({ slug: 'org.test.API_KEY' });

      // e1 — a reachless address IS the bare slug, byte for byte
      then('the exact address is the bare slug, unchanged', () => {
        expect(found[0]).toEqual({
          address: 'org.test.API_KEY',
          slug: 'org.test.API_KEY',
        });
      });

      then('the env=all twin follows it, also bare', () => {
        expect(found[1]).toEqual({
          address: 'org.all.API_KEY',
          slug: 'org.all.API_KEY',
        });
      });

      then('there are exactly two shots, in that order', () => {
        expect(found).toHaveLength(2);
      });
    });
  });

  given('[case2] a key asked for AT a reach', () => {
    when('[t0] its probe addresses are listed', () => {
      const found = getAllKeyrackProbeAddresses({
        slug: 'org.test.API_KEY',
        reach: { exid: 'beav@ehmpathy.com' },
      });

      then('the exact address carries the reach', () => {
        expect(found[0]!.address).toEqual('org.test.API_KEY@beav@ehmpathy.com');
      });

      // ⚠️ THE clamp. a slug-only fallback would emit the REACHLESS `org.all.API_KEY`
      //    here, so an ask at one reach could be answered by a key cut for none —
      //    a live credential for a reach nobody named (e18)
      then('the env=all twin CARRIES THE REACH ACROSS', () => {
        expect(found[1]!.address).toEqual('org.all.API_KEY@beav@ehmpathy.com');
        expect(found[1]!.address).not.toEqual('org.all.API_KEY');
      });

      // the manifest lookup reports which slug answered, so the slug must stay bare
      then('the slug beside each address is reach-free', () => {
        expect(found.map((probe) => probe.slug)).toEqual([
          'org.test.API_KEY',
          'org.all.API_KEY',
        ]);
      });
    });
  });

  given('[case3] a key already declared at env=all', () => {
    when('[t0] its probe addresses are listed', () => {
      const found = getAllKeyrackProbeAddresses({
        slug: 'org.all.API_KEY',
        reach: { exid: 'beav@ehmpathy.com' },
      });

      then(
        'there is one shot — a fallback to itself would be a wasted read',
        () => {
          expect(found).toHaveLength(1);
          expect(found[0]!.address).toEqual(
            'org.all.API_KEY@beav@ehmpathy.com',
          );
        },
      );
    });
  });

  given('[case4] a malformed slug with fewer than three segments', () => {
    when('[t0] its probe addresses are listed', () => {
      const found = getAllKeyrackProbeAddresses({ slug: 'two.parts' });

      // no env segment to swap, so there is no twin — and the exact shot still stands,
      // because it is the caller's job to decide what an absent answer means
      then('only the exact address is offered', () => {
        expect(found).toHaveLength(1);
        expect(found[0]!.address).toEqual('two.parts');
      });
    });
  });
});
