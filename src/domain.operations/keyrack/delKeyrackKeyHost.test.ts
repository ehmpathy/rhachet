import { given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';
import { genMockVaultAdapter } from '@src/.test/assets/genMockVaultAdapter';

import { delKeyrackKeyHost } from './delKeyrackKeyHost';
import type { KeyrackHostContext } from './genKeyrackHostContext';

// mock the daos to avoid filesystem access in unit tests
jest.mock('../../access/daos/daoKeyrackHostManifest', () => ({
  daoKeyrackHostManifest: {
    set: jest.fn(),
  },
}));

jest.mock('../../access/daos/daoKeyrackRepoManifest', () => ({
  daoKeyrackRepoManifest: {
    del: {
      keyFromEnv: jest.fn(),
    },
  },
}));

// mock the daemon sdk to verify prune call
const mockDaemonAccessRelock = jest.fn().mockResolvedValue({ relocked: [] });
jest.mock('./daemon/sdk', () => ({
  daemonAccessRelock: (...args: unknown[]) => mockDaemonAccessRelock(...args),
}));

describe('delKeyrackKeyHost', () => {
  beforeEach(() => {
    mockDaemonAccessRelock.mockClear();
  });

  given('[case1] key exists in manifest', () => {
    const vaultAdapter = genMockVaultAdapter();
    const context: KeyrackHostContext = {
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          'testorg.prod.MY_KEY': {
            vault: 'os.direct',
            env: 'prod',
            org: 'testorg',
          },
        },
      }),
      repoManifest: { org: 'testorg' },
      gitroot: '/tmp/test-repo',
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': vaultAdapter,
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
    };

    when('[t0] del called for that key', () => {
      then('returns effect: deleted', async () => {
        const result = await delKeyrackKeyHost(
          { slug: 'testorg.prod.MY_KEY' },
          context,
        );
        expect(result.effect).toEqual('deleted');
      });

      then('prunes only the deleted key from daemon', async () => {
        await delKeyrackKeyHost({ slug: 'testorg.prod.MY_KEY' }, context);
        expect(mockDaemonAccessRelock).toHaveBeenCalledWith({
          slugs: ['testorg.prod.MY_KEY'],
        });
      });
    });
  });

  given('[case2] key does not exist in manifest', () => {
    const context: KeyrackHostContext = {
      hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
      repoManifest: { org: 'testorg' },
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
    };

    when('[t0] del called for absent key', () => {
      then('returns effect: not_found', async () => {
        const result = await delKeyrackKeyHost(
          { slug: 'testorg.prod.ABSENT_KEY' },
          context,
        );
        expect(result.effect).toEqual('not_found');
      });

      then('does not prune daemon', async () => {
        await delKeyrackKeyHost({ slug: 'testorg.prod.ABSENT_KEY' }, context);
        expect(mockDaemonAccessRelock).not.toHaveBeenCalled();
      });
    });
  });

  given('[case3] sudo key (env=sudo)', () => {
    const vaultAdapter = genMockVaultAdapter();
    const context: KeyrackHostContext = {
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          'testorg.sudo.SECRET_TOKEN': {
            vault: 'os.secure',
            env: 'sudo',
            org: 'testorg',
          },
        },
      }),
      repoManifest: { org: 'testorg' },
      gitroot: '/tmp/test-repo',
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': vaultAdapter,
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
    };

    when('[t0] del called for sudo key', () => {
      then('returns effect: deleted', async () => {
        const result = await delKeyrackKeyHost(
          { slug: 'testorg.sudo.SECRET_TOKEN' },
          context,
        );
        expect(result.effect).toEqual('deleted');
      });

      then('prunes only the deleted key from daemon', async () => {
        await delKeyrackKeyHost({ slug: 'testorg.sudo.SECRET_TOKEN' }, context);
        expect(mockDaemonAccessRelock).toHaveBeenCalledWith({
          slugs: ['testorg.sudo.SECRET_TOKEN'],
        });
      });
    });
  });
});
