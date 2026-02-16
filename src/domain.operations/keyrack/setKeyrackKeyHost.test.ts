import { getError, given, then, when } from 'test-fns';

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
  given('[case1] new key to configure with @this org', () => {
    const context: KeyrackHostContext = {
      hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
      repoManifest: { org: 'ehmpathy' },
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
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

      then('env defaults to all', async () => {
        const result = await setKeyrackKeyHost(
          { slug: 'NEW_KEY', mech: 'REPLICA', vault: 'os.direct' },
          context,
        );
        expect(result.env).toEqual('all');
      });

      then('org resolves @this to ehmpathy', async () => {
        const result = await setKeyrackKeyHost(
          { slug: 'NEW_KEY', mech: 'REPLICA', vault: 'os.direct' },
          context,
        );
        expect(result.org).toEqual('ehmpathy');
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

    when('[t2] set called with env=sudo', () => {
      then('env is sudo', async () => {
        const result = await setKeyrackKeyHost(
          { slug: 'NEW_KEY', mech: 'REPLICA', vault: 'os.direct', env: 'sudo' },
          context,
        );
        expect(result.env).toEqual('sudo');
      });
    });

    when('[t3] set called with vaultRecipient', () => {
      then('vaultRecipient is stored', async () => {
        const result = await setKeyrackKeyHost(
          {
            slug: 'SECURE_KEY',
            mech: 'REPLICA',
            vault: 'os.secure',
            vaultRecipient: 'age1testrecipient...',
          },
          context,
        );
        expect(result.vaultRecipient).toEqual('age1testrecipient...');
      });
    });

    when('[t4] set called without vaultRecipient', () => {
      then('vaultRecipient defaults to null', async () => {
        const result = await setKeyrackKeyHost(
          { slug: 'SECURE_KEY', mech: 'REPLICA', vault: 'os.secure' },
          context,
        );
        expect(result.vaultRecipient).toBeNull();
      });
    });

    when('[t5] set called with maxDuration', () => {
      then('maxDuration is stored', async () => {
        const result = await setKeyrackKeyHost(
          {
            slug: 'SENSITIVE_KEY',
            mech: 'REPLICA',
            vault: 'os.secure',
            env: 'sudo',
            maxDuration: '5m',
          },
          context,
        );
        expect(result.maxDuration).toEqual('5m');
      });
    });

    when('[t6] set called without maxDuration', () => {
      then('maxDuration defaults to null', async () => {
        const result = await setKeyrackKeyHost(
          { slug: 'NEW_KEY', mech: 'REPLICA', vault: 'os.direct' },
          context,
        );
        expect(result.maxDuration).toBeNull();
      });
    });
  });

  given('[case2] key already exists with same attrs', () => {
    const context: KeyrackHostContext = {
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          EXISTING_KEY: {
            mech: 'REPLICA',
            vault: 'os.direct',
            exid: null,
            env: 'all',
            org: 'ehmpathy',
          },
        },
      }),
      repoManifest: { org: 'ehmpathy' },
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
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
          EXISTING_KEY: {
            mech: 'REPLICA',
            vault: 'os.direct',
            exid: null,
            env: 'all',
            org: 'ehmpathy',
          },
        },
      }),
      repoManifest: { org: 'ehmpathy' },
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
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

  given('[case4] org validation', () => {
    const context: KeyrackHostContext = {
      hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
      repoManifest: { org: 'ehmpathy' },
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
      },
    };

    when('[t0] org is @this', () => {
      then('resolves to ehmpathy', async () => {
        const result = await setKeyrackKeyHost(
          { slug: 'KEY', mech: 'REPLICA', vault: 'os.direct', org: '@this' },
          context,
        );
        expect(result.org).toEqual('ehmpathy');
      });
    });

    when('[t1] org is @all', () => {
      then('stores as @all', async () => {
        const result = await setKeyrackKeyHost(
          { slug: 'KEY', mech: 'REPLICA', vault: 'os.direct', org: '@all' },
          context,
        );
        expect(result.org).toEqual('@all');
      });
    });

    when('[t2] org is invalid', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(
          setKeyrackKeyHost(
            {
              slug: 'KEY',
              mech: 'REPLICA',
              vault: 'os.direct',
              org: 'invalid',
            },
            context,
          ),
        );
        expect(error.message).toContain('org must be @this or @all');
      });
    });
  });

  given('[case5] @this without repoManifest', () => {
    const context: KeyrackHostContext = {
      hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
      repoManifest: null,
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
      },
    };

    when('[t0] org defaults to @this', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(
          setKeyrackKeyHost(
            { slug: 'KEY', mech: 'REPLICA', vault: 'os.direct' },
            context,
          ),
        );
        expect(error.message).toContain('@this requires repo manifest');
      });
    });
  });
});
