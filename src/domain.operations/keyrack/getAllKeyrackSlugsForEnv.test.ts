import { given, then, when } from 'test-fns';

import { genMockKeyrackRepoManifest } from '@src/.test/assets/genMockKeyrackRepoManifest';

import { getAllKeyrackSlugsForEnv } from './getAllKeyrackSlugsForEnv';

describe('getAllKeyrackSlugsForEnv', () => {
  const manifest = genMockKeyrackRepoManifest({
    org: 'ehmpathy',
    envs: ['prod', 'prep'],
    keys: {
      'ehmpathy.prod.AWS_PROFILE': { env: 'prod', name: 'AWS_PROFILE' },
      'ehmpathy.prod.XAI_API_KEY': { env: 'prod', name: 'XAI_API_KEY' },
      'ehmpathy.prep.AWS_PROFILE': { env: 'prep', name: 'AWS_PROFILE' },
      'ehmpathy.prep.XAI_API_KEY': { env: 'prep', name: 'XAI_API_KEY' },
    },
  });

  const TEST_CASES = [
    {
      description: 'returns all slugs when env is "all"',
      given: { manifest, env: 'all' },
      expect: [
        'ehmpathy.prod.AWS_PROFILE',
        'ehmpathy.prod.XAI_API_KEY',
        'ehmpathy.prep.AWS_PROFILE',
        'ehmpathy.prep.XAI_API_KEY',
      ],
    },
    {
      description: 'returns only prod slugs when env is "prod"',
      given: { manifest, env: 'prod' },
      expect: ['ehmpathy.prod.AWS_PROFILE', 'ehmpathy.prod.XAI_API_KEY'],
    },
    {
      description: 'returns only prep slugs when env is "prep"',
      given: { manifest, env: 'prep' },
      expect: ['ehmpathy.prep.AWS_PROFILE', 'ehmpathy.prep.XAI_API_KEY'],
    },
    {
      description: 'returns empty array for unknown env',
      given: { manifest, env: 'sandbox' },
      expect: [],
    },
  ];

  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const result = getAllKeyrackSlugsForEnv(thisCase.given);
      expect(result).toEqual(thisCase.expect);
    }),
  );

  // test env.all key behavior
  // note: in a real hydrated manifest, env.all keys get BOTH:
  //   - .all. slugs (with env='all')
  //   - env-specific expansions (with env='prod', 'prep', etc)
  // when a query requests a specific env, we only return env-specific slugs
  // (the .all. slugs exist for direct env=all queries)
  describe('env=all key behavior', () => {
    // simulate a hydrated manifest where SHARED_TOKEN was in env.all
    // hydration creates: .all.SHARED_TOKEN + .prod.SHARED_TOKEN + .prep.SHARED_TOKEN
    const manifestHydrated = genMockKeyrackRepoManifest({
      org: 'ehmpathy',
      envs: ['prod', 'prep', 'all'],
      keys: {
        'ehmpathy.prod.AWS_PROFILE': { env: 'prod', name: 'AWS_PROFILE' },
        'ehmpathy.prep.AWS_PROFILE': { env: 'prep', name: 'AWS_PROFILE' },
        'ehmpathy.all.SHARED_TOKEN': { env: 'all', name: 'SHARED_TOKEN' },
        'ehmpathy.prod.SHARED_TOKEN': { env: 'prod', name: 'SHARED_TOKEN' },
        'ehmpathy.prep.SHARED_TOKEN': { env: 'prep', name: 'SHARED_TOKEN' },
      },
    });

    const INCLUSION_TEST_CASES = [
      {
        description:
          'returns only env-specific slugs for prod (no .all. duplicates)',
        given: { manifest: manifestHydrated, env: 'prod' },
        expect: ['ehmpathy.prod.AWS_PROFILE', 'ehmpathy.prod.SHARED_TOKEN'],
      },
      {
        description:
          'returns only env-specific slugs for prep (no .all. duplicates)',
        given: { manifest: manifestHydrated, env: 'prep' },
        expect: ['ehmpathy.prep.AWS_PROFILE', 'ehmpathy.prep.SHARED_TOKEN'],
      },
      {
        description: 'returns all slugs when env is all',
        given: { manifest: manifestHydrated, env: 'all' },
        expect: [
          'ehmpathy.prod.AWS_PROFILE',
          'ehmpathy.prep.AWS_PROFILE',
          'ehmpathy.all.SHARED_TOKEN',
          'ehmpathy.prod.SHARED_TOKEN',
          'ehmpathy.prep.SHARED_TOKEN',
        ],
      },
      {
        description: 'returns empty for unknown env',
        given: { manifest: manifestHydrated, env: 'sandbox' },
        expect: [],
      },
    ];

    INCLUSION_TEST_CASES.map((thisCase) =>
      test(thisCase.description, () => {
        const result = getAllKeyrackSlugsForEnv(thisCase.given);
        expect(result).toEqual(thisCase.expect);
      }),
    );
  });

  /**
   * ⚠️ .what = the ONE-ORG invariant, pinned — and the flag default that leans on it
   * .why = `get --org` carries a `'@this'` DEFAULT (`invokeKeyrack.ts`), unlike every peer
   *        sweep, whose filter defaults to "no filter". that default is a NO-OP only because a
   *        repo sweep yields one org's slugs — so `@this` expands to the one org the sweep can
   *        yield and drops not one row. break the invariant and the default starts to drop rows
   *        SILENTLY, with no error and no message
   * ⚠️ .where.the.guarantee.lives = NOT here. this operation returns `manifest.keys`' own slugs
   *        verbatim; it never reads `manifest.org` and never re-checks a slug against it. the
   *        one-org property is minted UPSTREAM, by the hydrator that builds each slug from
   *        `manifest.org`. so these rows pin the property at the grain a reader will check it,
   *        and name where it is actually enforced
   */
  given('[case1] a manifest whose keys all carry its own org', () => {
    when('[t0] a repo sweep yields its slugs', () => {
      then('every slug carries the manifest\u0027s own org', () => {
        const slugs = getAllKeyrackSlugsForEnv({ manifest, env: 'all' });

        // .note = asserted as a PROPERTY over the whole set, never as a slug list — a list is
        //         green for the wrong reason the moment a fixture gains a key
        expect(slugs.length).toBeGreaterThan(0);
        for (const slug of slugs)
          expect(slug.split('.')[0]).toEqual('ehmpathy');
      });
    });
  });

  given(
    '[case2] a manifest whose keys carry a FOREIGN org alongside its own',
    () => {
      const manifestWithForeignOrg = genMockKeyrackRepoManifest({
        org: 'ehmpathy',
        envs: ['prod'],
        keys: {
          'ehmpathy.prod.OWN_KEY': { env: 'prod', name: 'OWN_KEY' },
          'otherorg.prod.FOREIGN_KEY': { env: 'prod', name: 'FOREIGN_KEY' },
        },
      });

      when('[t0] a repo sweep yields its slugs', () => {
        then(
          'the foreign-org slug is yielded UNCHECKED — the hazard, on the record',
          () => {
            // ⚠️ .why = this row does not endorse the behavior; it documents that the guarantee is
            //        upstream. a reader who assumes this operation filters by org would leave
            //        `get`'s `'@this'` default unexamined — and that default is what would silently
            //        drop the foreign row, with no error, if a hydrator change ever let one in
            expect(
              getAllKeyrackSlugsForEnv({
                manifest: manifestWithForeignOrg,
                env: 'prod',
              }),
            ).toEqual(['ehmpathy.prod.OWN_KEY', 'otherorg.prod.FOREIGN_KEY']);
          },
        );
      });
    },
  );
});
