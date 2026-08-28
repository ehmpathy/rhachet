import { given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';

import { getAllKeyrackReachesForSlug } from './getAllKeyrackReachesForSlug';

describe('getAllKeyrackReachesForSlug', () => {
  given(
    '[case0] one slug cut at three reaches, one per vault reach-posture',
    () => {
      const hostManifest = genMockKeyrackHostManifest({
        hosts: {
          '@all.prep.MIXED@casey@addressed.com': {
            slug: '@all.prep.MIXED',
            reach: { exid: 'casey@addressed.com' },
            vault: 'os.secure',
            env: 'prep',
            org: '@all',
          },
          '@all.prep.MIXED@casey@viamech.com': {
            slug: '@all.prep.MIXED',
            reach: { exid: 'casey@viamech.com' },
            vault: 'aws.config',
            env: 'prep',
            org: '@all',
          },
          '@all.prep.MIXED@casey@unaddressable.com': {
            slug: '@all.prep.MIXED',
            reach: { exid: 'casey@unaddressable.com' },
            vault: 'os.envvar',
            env: 'prep',
            org: '@all',
          },
        },
      });

      when('[t0] the reaches are enumerated with no narrow', () => {
        // ⚠️ the default answers "what does the rack HOLD", which is vault-blind by design —
        //    the unlock loop's own skip is gated on `!input.reach`, a fact this query cannot
        //    see, so it must never decide addressability for that caller
        then('all three are returned', () => {
          expect(
            getAllKeyrackReachesForSlug({
              hosts: hostManifest.hosts,
              slug: '@all.prep.MIXED',
            }).map((reach) => reach.exid),
          ).toEqual([
            'casey@addressed.com',
            'casey@unaddressable.com',
            'casey@viamech.com',
          ]);
        });
      });

      when('[t1] the reaches are narrowed to what a vault can address', () => {
        // ⛔ THE NARROW. an UNADDRESSABLE vault stores one value per bare name, so an
        //    `unlock --reach` against it is refused outright — a caller that RECOMMENDS a
        //    reach must drop those or it names a command guaranteed to fail
        then('the unaddressable reach is dropped', () => {
          expect(
            getAllKeyrackReachesForSlug(
              { hosts: hostManifest.hosts, slug: '@all.prep.MIXED' },
              { only: 'vault-addressable' },
            ).map((reach) => reach.exid),
          ).not.toContain('casey@unaddressable.com');
        });

        // ⚠️ and VIA_MECH SURVIVES. an `aws.config` entry is held at a composite address like
        //    any other, so the key is genuinely stored per-reach and its unlock may well serve.
        //    to drop it with the unaddressable ones would suppress a CORRECT recommendation
        then('the ADDRESSED and VIA_MECH reaches both stand', () => {
          expect(
            getAllKeyrackReachesForSlug(
              { hosts: hostManifest.hosts, slug: '@all.prep.MIXED' },
              { only: 'vault-addressable' },
            ).map((reach) => reach.exid),
          ).toEqual(['casey@addressed.com', 'casey@viamech.com']);
        });
      });
    },
  );

  given('[case1] a slug cut at two reaches, and no reachless twin', () => {
    const hostManifest = genMockKeyrackHostManifest({
      hosts: {
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

    when('[t0] the reaches are enumerated', () => {
      // ⚠️ THE clamp behind acceptance 5. a bulk unlock names no reach, so without this
      //    enumeration the key has no target at all and gets reported `absent` while the
      //    rack plainly holds it — twice over
      then('it returns BOTH reaches, sorted', () => {
        expect(
          getAllKeyrackReachesForSlug({
            hosts: hostManifest.hosts,
            slug: '@all.prep.BRAINS_AUTH',
          }),
        ).toEqual([
          { exid: 'casey@ahbode.com' },
          { exid: 'casey@ahction.com' },
        ]);
      });

      // ⚠️ it reads the `slug` FIELD, never the map key. were it to read the key it would
      //    compare an ADDRESS to a slug, find no match, and return [] — the exact
      //    address-as-slug defect this whole route repairs (term=address)
      then('a slug the rack does not hold yields none', () => {
        expect(
          getAllKeyrackReachesForSlug({
            hosts: hostManifest.hosts,
            slug: '@all.prep.OTHER_KEY',
          }),
        ).toEqual([]);
      });
    });
  });

  given('[case2] a purely reachless rack — every extant manifest today', () => {
    const hostManifest = genMockKeyrackHostManifest({
      hosts: {
        'testorg.prep.REPO_KEY': { env: 'prep' },
        '@all.prep.MACHINE_KEY': { env: 'prep', org: '@all' },
      },
    });

    // ⚠️ acceptance 2's clamp at unit grain: an enumeration that found a phantom reach here
    //    would hand every extant bulk unlock a second target it never had
    when('[t0] the reaches are enumerated', () => {
      then(
        'it returns none, so a reachless rack expands to exactly one target',
        () => {
          expect(
            getAllKeyrackReachesForSlug({
              hosts: hostManifest.hosts,
              slug: 'testorg.prep.REPO_KEY',
            }),
          ).toEqual([]);
        },
      );
    });
  });

  given(
    '[case3] a reach held under the `env=all` twin, not the asked env',
    () => {
      const hostManifest = genMockKeyrackHostManifest({
        hosts: {
          'testorg.all.SHARED_KEY@casey@ahction.com': {
            slug: 'testorg.all.SHARED_KEY',
            reach: { exid: 'casey@ahction.com' },
            env: 'all',
          },
        },
      });

      // ⚠️ the enumeration must probe the SAME two shots the lookup does — the slug as asked,
      //    then its env=all twin. were it to probe only the first, it would find no reach, the
      //    key would get no target, and the env=all fallback it would have hit stays unreached
      when('[t0] the reaches are enumerated for the env-specific slug', () => {
        then('it finds the reach held on the env=all twin', () => {
          expect(
            getAllKeyrackReachesForSlug({
              hosts: hostManifest.hosts,
              slug: 'testorg.prep.SHARED_KEY',
            }),
          ).toEqual([{ exid: 'casey@ahction.com' }]);
        });
      });
    },
  );

  given(
    '[case4] one reach held under BOTH the slug and its env=all twin',
    () => {
      const hostManifest = genMockKeyrackHostManifest({
        hosts: {
          'testorg.prep.DUAL_KEY@casey@ahction.com': {
            slug: 'testorg.prep.DUAL_KEY',
            reach: { exid: 'casey@ahction.com' },
            env: 'prep',
          },
          'testorg.all.DUAL_KEY@casey@ahction.com': {
            slug: 'testorg.all.DUAL_KEY',
            reach: { exid: 'casey@ahction.com' },
            env: 'all',
          },
        },
      });

      // ⚠️ deduped by exid. a duplicate would drive the caller to unlock the same reach twice,
      //    and the second pass would render a phantom second row for one credential
      when('[t0] the reaches are enumerated', () => {
        then('the shared exid is named exactly once', () => {
          expect(
            getAllKeyrackReachesForSlug({
              hosts: hostManifest.hosts,
              slug: 'testorg.prep.DUAL_KEY',
            }),
          ).toEqual([{ exid: 'casey@ahction.com' }]);
        });
      });
    },
  );
});
