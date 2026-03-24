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
});
