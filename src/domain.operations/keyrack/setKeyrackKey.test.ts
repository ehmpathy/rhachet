import { given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';
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
});
