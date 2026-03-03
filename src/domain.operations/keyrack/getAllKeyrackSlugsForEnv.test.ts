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

  // test env='all' key inclusion
  describe('env=all key inclusion', () => {
    const manifestWithAllEnv = genMockKeyrackRepoManifest({
      org: 'ehmpathy',
      envs: ['prod', 'prep', 'all'],
      keys: {
        'ehmpathy.prod.AWS_PROFILE': { env: 'prod', name: 'AWS_PROFILE' },
        'ehmpathy.prep.AWS_PROFILE': { env: 'prep', name: 'AWS_PROFILE' },
        'ehmpathy.all.SHARED_TOKEN': { env: 'all', name: 'SHARED_TOKEN' },
      },
    });

    const INCLUSION_TEST_CASES = [
      {
        description: 'includes env=all keys when env is prod',
        given: { manifest: manifestWithAllEnv, env: 'prod' },
        expect: ['ehmpathy.prod.AWS_PROFILE', 'ehmpathy.all.SHARED_TOKEN'],
      },
      {
        description: 'includes env=all keys when env is prep',
        given: { manifest: manifestWithAllEnv, env: 'prep' },
        expect: ['ehmpathy.prep.AWS_PROFILE', 'ehmpathy.all.SHARED_TOKEN'],
      },
      {
        description: 'includes env=all keys when env is all',
        given: { manifest: manifestWithAllEnv, env: 'all' },
        expect: [
          'ehmpathy.prod.AWS_PROFILE',
          'ehmpathy.prep.AWS_PROFILE',
          'ehmpathy.all.SHARED_TOKEN',
        ],
      },
      {
        description: 'returns only env=all keys for unknown env',
        given: { manifest: manifestWithAllEnv, env: 'sandbox' },
        expect: ['ehmpathy.all.SHARED_TOKEN'],
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
