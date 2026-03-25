import { getError, given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';
import { genMockVaultAdapter } from '@src/.test/assets/genMockVaultAdapter';
import type { ContextKeyrackGrantUnlock } from '@src/domain.operations/keyrack/genContextKeyrackGrantUnlock';

import { unlockKeyrackKeys } from './unlockKeyrackKeys';

// mock the daemon interactions to avoid socket access in unit tests
jest.mock('../daemon/sdk', () => ({
  daemonAccessUnlock: jest.fn().mockResolvedValue({ unlocked: [] }),
  findsertKeyrackDaemon: jest.fn().mockResolvedValue(undefined),
}));

// mock the daemon socket path
jest.mock('../daemon/infra/getKeyrackDaemonSocketPath', () => ({
  getKeyrackDaemonSocketPath: jest
    .fn()
    .mockReturnValue('/tmp/keyrack.test.sock'),
}));

describe('unlockKeyrackKeys', () => {
  given('[case1] env=sudo without key', () => {
    const context: ContextKeyrackGrantUnlock = {
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          'ehmpathy.sudo.SECRET_KEY': {
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.direct',
            env: 'sudo',
            org: 'ehmpathy',
          },
        },
      }),
      repoManifest: { org: 'ehmpathy', envs: [], keys: {} },
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
      mechAdapters: {} as ContextKeyrackGrantUnlock['mechAdapters'],
    };

    when('[t0] unlock called without --key', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(
          unlockKeyrackKeys({ env: 'sudo' }, context),
        );
        expect(error.message).toContain('sudo credentials require --key flag');
      });
    });
  });

  given('[case2] env=sudo with key', () => {
    const vaultAdapter = genMockVaultAdapter({
      storage: { 'ehmpathy.sudo.SECRET_KEY': 'test-secret-value' },
    });
    const context: ContextKeyrackGrantUnlock = {
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          'ehmpathy.sudo.SECRET_KEY': {
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.direct',
            env: 'sudo',
            org: 'ehmpathy',
          },
        },
      }),
      repoManifest: { org: 'ehmpathy', envs: [], keys: {} },
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': vaultAdapter,
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
      mechAdapters: {} as ContextKeyrackGrantUnlock['mechAdapters'],
    };

    when('[t0] unlock called with --key', () => {
      then('uses 30min default TTL', async () => {
        const result = await unlockKeyrackKeys(
          { env: 'sudo', key: 'SECRET_KEY' },
          context,
        );
        expect(result.unlocked.length).toBe(1);
        const key = result.unlocked[0]!;
        expect(key.slug).toEqual('ehmpathy.sudo.SECRET_KEY');
        expect(key.env).toEqual('sudo');

        // verify TTL is approximately 30 minutes (allow 5s tolerance)
        const thirtyMinMs = 30 * 60 * 1000;
        expect(key.expiresAt).toBeDefined();
        const expiresAtMs = key.expiresAt
          ? new Date(key.expiresAt).getTime()
          : 0;
        const expiresIn = expiresAtMs - Date.now();
        expect(expiresIn).toBeGreaterThan(thirtyMinMs - 5000);
        expect(expiresIn).toBeLessThanOrEqual(thirtyMinMs);
      });
    });
  });

  given('[case3] env=all (regular keys)', () => {
    const vaultAdapter = genMockVaultAdapter({
      storage: { 'ehmpathy.all.API_KEY': 'test-api-key' },
    });
    const context: ContextKeyrackGrantUnlock = {
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          'ehmpathy.all.API_KEY': {
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.direct',
            env: 'all',
            org: 'ehmpathy',
          },
        },
      }),
      repoManifest: {
        org: 'ehmpathy',
        envs: [],
        keys: {
          'ehmpathy.all.API_KEY': {
            slug: 'ehmpathy.all.API_KEY',
            mech: 'PERMANENT_VIA_REPLICA',
            env: 'all',
            name: 'API_KEY',
            grade: null,
          },
        },
      },
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': vaultAdapter,
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
      mechAdapters: {} as ContextKeyrackGrantUnlock['mechAdapters'],
    };

    when('[t0] unlock called without --env (defaults to all)', () => {
      then('uses 9h default TTL', async () => {
        const result = await unlockKeyrackKeys({}, context);
        expect(result.unlocked.length).toBe(1);
        const key = result.unlocked[0]!;
        expect(key.slug).toEqual('ehmpathy.all.API_KEY');

        // verify TTL is approximately 9 hours (allow 5s tolerance)
        const nineHoursMs = 9 * 60 * 60 * 1000;
        expect(key.expiresAt).toBeDefined();
        const expiresAtMs = key.expiresAt
          ? new Date(key.expiresAt).getTime()
          : 0;
        const expiresIn = expiresAtMs - Date.now();
        expect(expiresIn).toBeGreaterThan(nineHoursMs - 5000);
        expect(expiresIn).toBeLessThanOrEqual(nineHoursMs);
      });
    });
  });

  given('[case4] duration exceeds maxDuration', () => {
    const vaultAdapter = genMockVaultAdapter({
      storage: { 'ehmpathy.sudo.SENSITIVE_KEY': 'sensitive-value' },
    });
    const context: ContextKeyrackGrantUnlock = {
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          'ehmpathy.sudo.SENSITIVE_KEY': {
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.direct',
            env: 'sudo',
            org: 'ehmpathy',
            maxDuration: '5m',
          },
        },
      }),
      repoManifest: { org: 'ehmpathy', envs: [], keys: {} },
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': vaultAdapter,
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
      mechAdapters: {} as ContextKeyrackGrantUnlock['mechAdapters'],
    };

    when('[t0] unlock called with duration=1h (exceeds 5m maxDuration)', () => {
      then('caps to maxDuration', async () => {
        // capture console.warn
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const result = await unlockKeyrackKeys(
          { env: 'sudo', key: 'SENSITIVE_KEY', duration: '1h' },
          context,
        );
        expect(result.unlocked.length).toBe(1);
        const key = result.unlocked[0]!;

        // verify TTL is approximately 5 minutes (capped), not 1 hour
        const fiveMinMs = 5 * 60 * 1000;
        const oneHourMs = 60 * 60 * 1000;
        expect(key.expiresAt).toBeDefined();
        const expiresAtMs = key.expiresAt
          ? new Date(key.expiresAt).getTime()
          : 0;
        const expiresIn = expiresAtMs - Date.now();
        expect(expiresIn).toBeGreaterThan(fiveMinMs - 5000);
        expect(expiresIn).toBeLessThanOrEqual(fiveMinMs);
        expect(expiresIn).toBeLessThan(oneHourMs);

        // verify warn was logged
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('duration capped to 5m'),
        );

        warnSpy.mockRestore();
      });
    });
  });

  given('[case5] repoManifest absent and env != sudo', () => {
    const context: ContextKeyrackGrantUnlock = {
      hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
      repoManifest: null,
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
      mechAdapters: {} as ContextKeyrackGrantUnlock['mechAdapters'],
    };

    when('[t0] unlock called with env=prod (not sudo)', () => {
      then('throws error about absent keyrack.yml', async () => {
        const error = await getError(
          unlockKeyrackKeys({ env: 'prod' }, context),
        );
        expect(error.message).toContain('no keyrack.yml found in repo');
      });
    });
  });

  /**
   * [case6] env=all fallback when key set with env=all but unlocked for specific env
   *
   * .scenario:
   *   - repo manifest has `testorg.test.API_KEY` (expanded from env.all declaration)
   *   - host manifest has only `testorg.all.API_KEY` (key was SET with env=all)
   *   - unlock for env=test should find env=all fallback
   */
  given('[case6] env=all fallback for specific env unlock', () => {
    const vaultAdapter = genMockVaultAdapter({
      storage: { 'testorg.all.API_KEY': 'all-env-api-key-value' },
    });
    const context: ContextKeyrackGrantUnlock = {
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          // key was SET with env=all — only .all. slug in hostManifest
          'testorg.all.API_KEY': {
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.direct',
            env: 'all',
            org: 'testorg',
          },
        },
      }),
      repoManifest: {
        org: 'testorg',
        envs: ['test', 'prod'],
        keys: {
          // repo manifest has env=all key expanded for each declared env
          'testorg.all.API_KEY': {
            slug: 'testorg.all.API_KEY',
            mech: 'PERMANENT_VIA_REPLICA',
            env: 'all',
            name: 'API_KEY',
            grade: null,
          },
          'testorg.test.API_KEY': {
            slug: 'testorg.test.API_KEY',
            mech: 'PERMANENT_VIA_REPLICA',
            env: 'test',
            name: 'API_KEY',
            grade: null,
          },
          'testorg.prod.API_KEY': {
            slug: 'testorg.prod.API_KEY',
            mech: 'PERMANENT_VIA_REPLICA',
            env: 'prod',
            name: 'API_KEY',
            grade: null,
          },
        },
      },
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': vaultAdapter,
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
      mechAdapters: {} as ContextKeyrackGrantUnlock['mechAdapters'],
    };

    when('[t0] unlock called with env=test (fallback to env=all)', () => {
      then('finds env=all key via fallback', async () => {
        const result = await unlockKeyrackKeys({ env: 'test' }, context);

        // should unlock the env=all key (fallback)
        expect(result.unlocked.length).toBe(1);
        const key = result.unlocked[0]!;
        expect(key.slug).toEqual('testorg.all.API_KEY');
        expect(key.env).toEqual('all');
        expect(key.key.secret).toEqual('all-env-api-key-value');

        // .note = env=all fallback handled at daemon lookup time, not storage time

        // should NOT have omitted keys (fallback succeeded)
        expect(result.omitted.length).toBe(0);
      });
    });

    when('[t1] unlock called with env=prod (fallback to env=all)', () => {
      then('finds env=all key via fallback', async () => {
        const result = await unlockKeyrackKeys({ env: 'prod' }, context);

        // should unlock the env=all key (fallback)
        expect(result.unlocked.length).toBe(1);
        const key = result.unlocked[0]!;
        expect(key.slug).toEqual('testorg.all.API_KEY');
        expect(key.env).toEqual('all');

        // .note = env=all fallback handled at daemon lookup time, not storage time

        // should NOT have omitted keys (fallback succeeded)
        expect(result.omitted.length).toBe(0);
      });
    });
  });

  given('[case7] sudo key not found', () => {
    const context: ContextKeyrackGrantUnlock = {
      hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
      repoManifest: { org: 'ehmpathy', envs: [], keys: {} },
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
      mechAdapters: {} as ContextKeyrackGrantUnlock['mechAdapters'],
    };

    when('[t0] unlock called with --key that does not exist', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(
          unlockKeyrackKeys({ env: 'sudo', key: 'NONEXISTENT_KEY' }, context),
        );
        expect(error.message).toContain('sudo key not found: NONEXISTENT_KEY');
      });
    });
  });
});
