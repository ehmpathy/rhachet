import { UnexpectedCodePathError } from 'helpful-errors';
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
    set: jest.fn(),
  },
}));

describe('setKeyrackKey', () => {
  given('[case1] aws.iam.sso vault with valid exid', () => {
    when('[t0] setKeyrackKey is called', () => {
      then('it should call vault.set with the exid', async () => {
        const mockAwsSsoAdapter = genMockVaultAdapter();
        mockAwsSsoAdapter.set = jest.fn();
        mockAwsSsoAdapter.get = jest.fn().mockResolvedValue('test-profile');
        mockAwsSsoAdapter.unlock = jest.fn();
        mockAwsSsoAdapter.relock = jest.fn();

        const context: KeyrackHostContext = {
          hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': genMockVaultAdapter(),
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.iam.sso': mockAwsSsoAdapter,
          },
        };

        await setKeyrackKey(
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

        expect(mockAwsSsoAdapter.set).toHaveBeenCalledWith({
          slug: 'ehmpathy.test.AWS_PROFILE',
          value: 'test-profile',
        });
      });

      then('it should perform roundtrip validation', async () => {
        const mockAwsSsoAdapter = genMockVaultAdapter();
        mockAwsSsoAdapter.set = jest.fn();
        mockAwsSsoAdapter.get = jest.fn().mockResolvedValue('test-profile');
        mockAwsSsoAdapter.unlock = jest.fn();
        mockAwsSsoAdapter.relock = jest.fn();

        const context: KeyrackHostContext = {
          hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': genMockVaultAdapter(),
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.iam.sso': mockAwsSsoAdapter,
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

        // verify roundtrip: unlock -> get -> relock
        expect(mockAwsSsoAdapter.unlock).toHaveBeenCalled();
        expect(mockAwsSsoAdapter.get).toHaveBeenCalledWith({
          slug: 'ehmpathy.test.AWS_PROFILE',
        });
        expect(mockAwsSsoAdapter.relock).toHaveBeenCalledWith({
          slug: 'ehmpathy.test.AWS_PROFILE',
        });
        expect(result.roundtripValidated).toBe(true);
      });

      then('it should return the configured slug', async () => {
        const mockAwsSsoAdapter = genMockVaultAdapter();
        mockAwsSsoAdapter.set = jest.fn();
        mockAwsSsoAdapter.get = jest.fn().mockResolvedValue('test-profile');
        mockAwsSsoAdapter.unlock = jest.fn();
        mockAwsSsoAdapter.relock = jest.fn();

        const context: KeyrackHostContext = {
          hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': genMockVaultAdapter(),
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.iam.sso': mockAwsSsoAdapter,
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
        expect(result.results[0]).toEqual({
          slug: 'ehmpathy.test.AWS_PROFILE',
          vault: 'aws.iam.sso',
          mech: 'EPHEMERAL_VIA_AWS_SSO',
        });
      });
    });
  });

  given('[case2] roundtrip validation fails', () => {
    when('[t0] vault.get returns different value', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const mockAwsSsoAdapter = genMockVaultAdapter();
        mockAwsSsoAdapter.set = jest.fn();
        mockAwsSsoAdapter.get = jest.fn().mockResolvedValue('wrong-profile'); // different value!
        mockAwsSsoAdapter.unlock = jest.fn();
        mockAwsSsoAdapter.relock = jest.fn();

        const context: KeyrackHostContext = {
          hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': genMockVaultAdapter(),
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.iam.sso': mockAwsSsoAdapter,
          },
        };

        await expect(
          setKeyrackKey(
            {
              key: 'AWS_PROFILE',
              env: 'test',
              org: 'ehmpathy',
              vault: 'aws.iam.sso',
              mech: 'EPHEMERAL_VIA_AWS_SSO',
              exid: 'test-profile',
            },
            context,
          ),
        ).rejects.toThrow(UnexpectedCodePathError);
      });
    });
  });

  given('[case3] non-aws.iam.sso vault', () => {
    when('[t0] setKeyrackKey is called with os.direct vault', () => {
      then('it should not perform roundtrip validation', async () => {
        const mockOsDirectAdapter = genMockVaultAdapter();
        mockOsDirectAdapter.set = jest.fn();
        mockOsDirectAdapter.get = jest.fn();
        mockOsDirectAdapter.unlock = jest.fn();
        mockOsDirectAdapter.relock = jest.fn();

        const context: KeyrackHostContext = {
          hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': mockOsDirectAdapter,
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.iam.sso': genMockVaultAdapter(),
          },
        };

        const result = await setKeyrackKey(
          {
            key: 'SOME_KEY',
            env: 'test',
            org: 'ehmpathy',
            vault: 'os.direct',
            mech: 'PERMANENT_VIA_REPLICA',
            exid: 'some-value',
          },
          context,
        );

        // no vault operations for os.direct (yet)
        expect(mockOsDirectAdapter.set).not.toHaveBeenCalled();
        expect(result.roundtripValidated).toBe(false);
      });
    });
  });
});
