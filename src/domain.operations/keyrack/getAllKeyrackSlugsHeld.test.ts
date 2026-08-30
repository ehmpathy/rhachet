import { given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';

import { getAllKeyrackSlugsHeld } from './getAllKeyrackSlugsHeld';

/**
 * .what = clamps that the one shared answer to "which keys does this rack hold" reads the `slug`
 *         FIELD off each entry, never the address-shaped map key
 * .why = this replaced three byte-identical inline copies, each of which had re-derived the
 *        address-vs-slug invariant in its own comment. the whole point of one named home is that
 *        the invariant is clamped ONCE — so these cases are the clamp the three copies never had
 */
describe('getAllKeyrackSlugsHeld', () => {
  given('[case1] a rack that holds ONE slug at TWO reaches', () => {
    const { hosts } = genMockKeyrackHostManifest({
      hosts: {
        '@all.prep.BRAINS_AUTH@casey@ahction.com': {
          slug: '@all.prep.BRAINS_AUTH',
          org: '@all',
          env: 'prep',
          reach: { exid: 'casey@ahction.com' },
        },
        '@all.prep.BRAINS_AUTH@casey@ahbode.com': {
          slug: '@all.prep.BRAINS_AUTH',
          org: '@all',
          env: 'prep',
          reach: { exid: 'casey@ahbode.com' },
        },
      },
    });

    when('[t0] the held slugs are named', () => {
      // ⛔ THE ADDRESS CLAMP. the map keys here are ADDRESSES, and both carry an `@` in their
      //    reach exid. a read of the KEYS would yield two address strings — the exact defect
      //    this whole behavior repaired — and a `split('@')` recovery would be worse still,
      //    since an email legally holds one (`term=address`)
      then('it names the bare slug, never either address', () => {
        expect(getAllKeyrackSlugsHeld({ hosts })).toEqual([
          '@all.prep.BRAINS_AUTH',
        ]);
      });

      // ⚠️ THE DEDUPE CLAMP, stated as its own case. N reaches of one slug are N addresses but
      //    ONE slug — every caller of this leaf asks which keys are held, never at how many
      //    reaches, and the reach is re-applied per slug downstream
      then('two reaches of one slug collapse to one slug', () => {
        expect(getAllKeyrackSlugsHeld({ hosts })).toHaveLength(1);
      });
    });
  });

  given(
    '[case2] a reachless rack — the shape that predates reach entirely',
    () => {
      const { hosts } = genMockKeyrackHostManifest({
        hosts: {
          'testorg.prep.REPO_KEY': { org: 'testorg', env: 'prep' },
          'testorg.prod.OTHER_KEY': { org: 'testorg', env: 'prod' },
        },
      });

      // ⚠️ the guard against an over-narrow read. for a reachless entry `slug === address`, so
      //    this must return exactly what a read of the keys would have — otherwise the extraction
      //    that replaced three call sites would have changed all three
      when('[t0] the held slugs are named', () => {
        then('every slug is named, in map order', () => {
          expect(getAllKeyrackSlugsHeld({ hosts })).toEqual([
            'testorg.prep.REPO_KEY',
            'testorg.prod.OTHER_KEY',
          ]);
        });
      });
    },
  );

  given('[case3] an empty rack', () => {
    when('[t0] the held slugs are named', () => {
      // a rack with no entries is a real state, not a defensive guard — a fresh box holds one
      then('it names none, and does not throw', () => {
        expect(getAllKeyrackSlugsHeld({ hosts: {} })).toEqual([]);
      });
    });
  });
});
