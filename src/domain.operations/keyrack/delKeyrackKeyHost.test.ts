import { given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';
import { genMockVaultAdapter } from '@src/.test/assets/genMockVaultAdapter';

import { delKeyrackKeyHost } from './delKeyrackKeyHost';
import type { ContextKeyrack } from './genContextKeyrack';

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

// mock inventory dao to avoid filesystem access in unit tests
jest.mock('../../access/daos/daoKeyrackInventory', () => ({
  daoKeyrackInventory: {
    del: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  daoKeyrackInventory,
} = require('../../access/daos/daoKeyrackInventory');

describe('delKeyrackKeyHost', () => {
  beforeEach(() => {
    mockDaemonAccessRelock.mockClear();
    daoKeyrackInventory.del.mockClear();
  });

  given('[case1] key exists in manifest', () => {
    const vaultAdapter = genMockVaultAdapter();
    const context: ContextKeyrack = {
      owner: null,
      identity: {
        getOne: async () => 'test-identity',
        getAll: { discovered: async () => ['test-identity'], prescribed: [] },
      },
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          'testorg.prod.MY_KEY': {
            vault: 'os.direct',
            env: 'prod',
            org: 'testorg',
          },
        },
      }),
      repoManifest: null,
      gitroot: '/tmp/test-repo',
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': vaultAdapter,
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.config': genMockVaultAdapter(),
        'github.secrets': genMockVaultAdapter(),
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
          owner: null,
        });
      });

      then('deletes inventory entry for non-daemon vault', async () => {
        await delKeyrackKeyHost({ slug: 'testorg.prod.MY_KEY' }, context);
        expect(daoKeyrackInventory.del).toHaveBeenCalledWith({
          slug: 'testorg.prod.MY_KEY',
          owner: null,
        });
      });
    });
  });

  given('[case2] key does not exist in manifest', () => {
    const context: ContextKeyrack = {
      owner: null,
      identity: {
        getOne: async () => 'test-identity',
        getAll: { discovered: async () => ['test-identity'], prescribed: [] },
      },
      hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
      repoManifest: null,
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.config': genMockVaultAdapter(),
        'github.secrets': genMockVaultAdapter(),
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

      then('does not delete inventory entry', async () => {
        await delKeyrackKeyHost({ slug: 'testorg.prod.ABSENT_KEY' }, context);
        expect(daoKeyrackInventory.del).not.toHaveBeenCalled();
      });

      then('does not prune daemon', async () => {
        await delKeyrackKeyHost({ slug: 'testorg.prod.ABSENT_KEY' }, context);
        expect(mockDaemonAccessRelock).not.toHaveBeenCalled();
      });
    });
  });

  given('[case3] sudo key (env=sudo)', () => {
    const vaultAdapter = genMockVaultAdapter();
    const context: ContextKeyrack = {
      owner: null,
      identity: {
        getOne: async () => 'test-identity',
        getAll: { discovered: async () => ['test-identity'], prescribed: [] },
      },
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          'testorg.sudo.SECRET_TOKEN': {
            vault: 'os.secure',
            env: 'sudo',
            org: 'testorg',
          },
        },
      }),
      repoManifest: null,
      gitroot: '/tmp/test-repo',
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': vaultAdapter,
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.config': genMockVaultAdapter(),
        'github.secrets': genMockVaultAdapter(),
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
          owner: null,
        });
      });
    });
  });

  given('[case4] os.daemon vault (ephemeral)', () => {
    const vaultAdapter = genMockVaultAdapter();
    const context: ContextKeyrack = {
      owner: null,
      identity: {
        getOne: async () => 'test-identity',
        getAll: { discovered: async () => ['test-identity'], prescribed: [] },
      },
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          'testorg.prod.DAEMON_KEY': {
            vault: 'os.daemon',
            env: 'prod',
            org: 'testorg',
          },
        },
      }),
      repoManifest: null,
      gitroot: '/tmp/test-repo',
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': vaultAdapter,
        '1password': genMockVaultAdapter(),
        'aws.config': genMockVaultAdapter(),
        'github.secrets': genMockVaultAdapter(),
      },
    };

    when('[t0] del called for daemon key', () => {
      then('returns effect: deleted', async () => {
        const result = await delKeyrackKeyHost(
          { slug: 'testorg.prod.DAEMON_KEY' },
          context,
        );
        expect(result.effect).toEqual('deleted');
      });

      then('does NOT delete inventory entry (ephemeral keys)', async () => {
        await delKeyrackKeyHost({ slug: 'testorg.prod.DAEMON_KEY' }, context);
        expect(daoKeyrackInventory.del).not.toHaveBeenCalled();
      });
    });
  });
});
