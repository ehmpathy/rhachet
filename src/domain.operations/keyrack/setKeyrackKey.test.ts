import { given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';
import { genMockKeyrackRepoManifest } from '@src/.test/assets/genMockKeyrackRepoManifest';
import { genMockVaultAdapter } from '@src/.test/assets/genMockVaultAdapter';

import type { KeyrackHostContext } from './genKeyrackHostContext';
import { setKeyrackKey } from './setKeyrackKey';

// mock the daos to avoid filesystem access in unit tests
jest.mock('../../access/daos/daoKeyrackHostManifest', () => ({
  daoKeyrackHostManifest: {
    set: jest.fn(),
  },
}));

jest.mock('../../access/daos/daoKeyrackRepoManifest', () => ({
  daoKeyrackRepoManifest: {
    set: {
      findsertKeyToEnv: jest.fn(),
    },
  },
}));

describe('setKeyrackKey', () => {
  given('[case1] single env key', () => {
    when('[t0] called with specific env', () => {
      then(
        'it should delegate to setKeyrackKeyHost with correct slug',
        async () => {
          const mockAdapter = genMockVaultAdapter();
          mockAdapter.set = jest.fn();

          const context: KeyrackHostContext = {
            owner: null,
            hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
            vaultAdapters: {
              'os.envvar': genMockVaultAdapter(),
              'os.direct': mockAdapter,
              'os.secure': genMockVaultAdapter(),
              'os.daemon': genMockVaultAdapter(),
              '1password': genMockVaultAdapter(),
              'aws.iam.sso': genMockVaultAdapter(),
            },
          };

          const result = await setKeyrackKey(
            {
              key: 'MY_KEY',
              env: 'prod',
              org: 'testorg',
              vault: 'os.direct',
              mech: 'PERMANENT_VIA_REPLICA',
              secret: 'test-secret',
            },
            context,
          );

          expect(result.results).toHaveLength(1);
          expect(result.results[0]).toMatchObject({
            slug: 'testorg.prod.MY_KEY',
            vault: 'os.direct',
            mech: 'PERMANENT_VIA_REPLICA',
          });
        },
      );
    });
  });

  given('[case2] aws.iam.sso vault', () => {
    when('[t0] called with aws.iam.sso vault and exid', () => {
      then('it should pass exid through to setKeyrackKeyHost', async () => {
        const mockAdapter = genMockVaultAdapter();
        mockAdapter.set = jest.fn();

        const context: KeyrackHostContext = {
          owner: null,
          hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': genMockVaultAdapter(),
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.iam.sso': mockAdapter,
          },
        };

        const result = await setKeyrackKey(
          {
            key: 'AWS_PROFILE',
            env: 'test',
            org: 'ehmpathy',
            vault: 'aws.iam.sso',
            mech: 'EPHEMERAL_VIA_AWS_SSO',
            exid: 'test-profile',
          },
          context,
        );

        expect(result.results).toHaveLength(1);
        expect(result.results[0]).toMatchObject({
          slug: 'ehmpathy.test.AWS_PROFILE',
          vault: 'aws.iam.sso',
          mech: 'EPHEMERAL_VIA_AWS_SSO',
        });
      });
    });
  });

  given('[case3] env=all stores single slug', () => {
    when('[t0] called with env=all', () => {
      then('it should store under $org.all.$key only', async () => {
        const mockAdapter = genMockVaultAdapter();
        mockAdapter.set = jest.fn();

        const context: KeyrackHostContext = {
          owner: null,
          hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
          repoManifest: {
            org: 'ehmpathy',
          },
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': mockAdapter,
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.iam.sso': genMockVaultAdapter(),
          },
        };

        const result = await setKeyrackKey(
          {
            key: 'NEW_KEY',
            env: 'all',
            org: 'customorg',
            vault: 'os.direct',
            mech: 'PERMANENT_VIA_REPLICA',
            secret: 'test-secret',
            at: 'custom/role/keyrack.yml',
          },
          context,
        );

        // should store exactly ONE slug under $org.all.$key
        expect(result.results).toHaveLength(1);
        expect(result.results[0]).toMatchObject({
          slug: 'customorg.all.NEW_KEY',
          vault: 'os.direct',
          mech: 'PERMANENT_VIA_REPLICA',
        });
      });
    });

    when(
      '[t1] called with env=all and repo manifest with multiple envs',
      () => {
        then('it should NOT expand to multiple slugs', async () => {
          const mockAdapter = genMockVaultAdapter();
          mockAdapter.set = jest.fn();

          // create repo manifest with multiple envs and prior keys
          const repoManifest = genMockKeyrackRepoManifest({
            org: 'ehmpathy',
            envs: ['prod', 'prep', 'test'],
            keys: {
              'ehmpathy.prod.PRIOR_KEY': { env: 'prod', name: 'PRIOR_KEY' },
              'ehmpathy.prep.PRIOR_KEY': { env: 'prep', name: 'PRIOR_KEY' },
            },
          });

          const context: KeyrackHostContext = {
            owner: null,
            hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
            repoManifest: { org: repoManifest.org },
            vaultAdapters: {
              'os.envvar': genMockVaultAdapter(),
              'os.direct': mockAdapter,
              'os.secure': genMockVaultAdapter(),
              'os.daemon': genMockVaultAdapter(),
              '1password': genMockVaultAdapter(),
              'aws.iam.sso': genMockVaultAdapter(),
            },
          };

          const result = await setKeyrackKey(
            {
              key: 'MY_SECRET',
              env: 'all',
              org: 'ehmpathy',
              vault: 'os.direct',
              mech: 'PERMANENT_VIA_REPLICA',
              secret: 'test-secret',
              repoManifest,
            },
            context,
          );

          // should NOT expand — should store exactly ONE slug
          expect(result.results).toHaveLength(1);
          expect(result.results[0]!.slug).toEqual('ehmpathy.all.MY_SECRET');
          // should NOT have prod, prep, or test slugs
          expect(result.results.map((r) => r.slug)).not.toContain(
            'ehmpathy.prod.MY_SECRET',
          );
          expect(result.results.map((r) => r.slug)).not.toContain(
            'ehmpathy.prep.MY_SECRET',
          );
          expect(result.results.map((r) => r.slug)).not.toContain(
            'ehmpathy.test.MY_SECRET',
          );
        });
      },
    );
  });
});
