import { given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';
import { genMockVaultAdapter } from '@src/.test/assets/genMockVaultAdapter';

import type { KeyrackHostContext } from './genKeyrackHostContext';
import { setKeyrackKeyHost } from './setKeyrackKeyHost';

// mock the dao to avoid filesystem access in unit tests
jest.mock('../../access/daos/daoKeyrackHostManifest', () => ({
  daoKeyrackHostManifest: {
    set: jest.fn(),
  },
}));

describe('setKeyrackKeyHost', () => {
  given('[case1] new key to configure', () => {
    const context: KeyrackHostContext = {
      hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
      },
    };

    when('[t0] set called with new key', () => {
      then('returns configured key host', async () => {
        const result = await setKeyrackKeyHost(
          { slug: 'NEW_KEY', mech: 'REPLICA', vault: 'os.direct' },
          context,
        );
        expect(result.slug).toEqual('NEW_KEY');
        expect(result.mech).toEqual('REPLICA');
        expect(result.vault).toEqual('os.direct');
      });

      then('exid defaults to null', async () => {
        const result = await setKeyrackKeyHost(
          { slug: 'NEW_KEY', mech: 'REPLICA', vault: 'os.direct' },
          context,
        );
        expect(result.exid).toBeNull();
      });

      then('timestamps are set', async () => {
        const result = await setKeyrackKeyHost(
          { slug: 'NEW_KEY', mech: 'REPLICA', vault: 'os.direct' },
          context,
        );
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
      });
    });

    when('[t1] set called with exid', () => {
      then('exid is stored', async () => {
        const result = await setKeyrackKeyHost(
          {
            slug: 'NEW_KEY',
            mech: 'GITHUB_APP',
            vault: '1password',
            exid: 'op://vault/item',
          },
          context,
        );
        expect(result.exid).toEqual('op://vault/item');
      });
    });
  });

  given('[case2] key already exists with same attrs', () => {
    const context: KeyrackHostContext = {
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          EXISTING_KEY: { mech: 'REPLICA', vault: 'os.direct', exid: null },
        },
      }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
      },
    };

    when('[t0] set called with same attrs (findsert semantics)', () => {
      then('returns found key host without update', async () => {
        const result = await setKeyrackKeyHost(
          { slug: 'EXISTING_KEY', mech: 'REPLICA', vault: 'os.direct' },
          context,
        );
        expect(result.slug).toEqual('EXISTING_KEY');
        expect(result.mech).toEqual('REPLICA');
        expect(result.vault).toEqual('os.direct');
      });
    });
  });

  given('[case3] key exists with different attrs', () => {
    const context: KeyrackHostContext = {
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          EXISTING_KEY: { mech: 'REPLICA', vault: 'os.direct', exid: null },
        },
      }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
      },
    };

    when('[t0] set called with different vault', () => {
      then('returns updated key host', async () => {
        const result = await setKeyrackKeyHost(
          { slug: 'EXISTING_KEY', mech: 'REPLICA', vault: 'os.secure' },
          context,
        );
        expect(result.vault).toEqual('os.secure');
      });
    });

    when('[t1] set called with different mech', () => {
      then('returns updated key host', async () => {
        const result = await setKeyrackKeyHost(
          { slug: 'EXISTING_KEY', mech: 'GITHUB_APP', vault: 'os.direct' },
          context,
        );
        expect(result.mech).toEqual('GITHUB_APP');
      });
    });
  });
});
