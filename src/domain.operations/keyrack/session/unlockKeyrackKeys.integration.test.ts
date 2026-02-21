import { given, then, useBeforeAll, when } from 'test-fns';

import { genMockVaultAdapter } from '../../../.test/assets/genMockVaultAdapter';
import { withTempHome } from '../../../.test/infra/withTempHome';
import { daoKeyrackHostManifest } from '../../../access/daos/daoKeyrackHostManifest';
import {
  KeyrackHostManifest,
  KeyrackKeyRecipient,
} from '../../../domain.objects/keyrack';
import { generateAgeKeyPair } from '../adapters/ageRecipientCrypto';
import { getKeyrackDaemonSocketPath } from '../daemon/infra/getKeyrackDaemonSocketPath';
import { daemonAccessGet } from '../daemon/sdk';
import type { ContextKeyrackGrantUnlock } from '../genContextKeyrackGrantUnlock';
import { unlockKeyrackKeys } from './unlockKeyrackKeys';

describe('unlockKeyrackKeys.integration', () => {
  const tempHome = withTempHome({ name: 'unlockKeyrackKeys-integration' });

  beforeAll(() => tempHome.setup());
  afterAll(() => tempHome.teardown());

  beforeEach(() => {
    daoKeyrackHostManifest.setSessionIdentity(null);
  });

  given('[case1] sudo credential with 30min default TTL', () => {
    const keyPair = useBeforeAll(async () => generateAgeKeyPair());
    const secretValue = 'sudo-secret-value-123';

    const manifest = useBeforeAll(async () => {
      daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);

      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: keyPair.recipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.age',
          owner: null,
          recipients: [recipient],
          hosts: {
            'ehmpathy.sudo.ADMIN_TOKEN': {
              slug: 'ehmpathy.sudo.ADMIN_TOKEN',
              mech: 'REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'sudo',
              org: 'ehmpathy',
              vaultRecipient: null,
              maxDuration: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      });
    });

    when('[t0] unlock called with env=sudo and --key', () => {
      then('unlocks single key with 30min TTL', async () => {
        daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);

        const vaultAdapter = genMockVaultAdapter({
          storage: { 'ehmpathy.sudo.ADMIN_TOKEN': secretValue },
        });

        const context: ContextKeyrackGrantUnlock = {
          hostManifest: manifest,
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

        const result = await unlockKeyrackKeys(
          { env: 'sudo', key: 'ADMIN_TOKEN' },
          context,
        );

        expect(result.unlocked.length).toBe(1);
        const key = result.unlocked[0]!;
        expect(key.slug).toEqual('ehmpathy.sudo.ADMIN_TOKEN');
        expect(key.env).toEqual('sudo');
        expect(key.org).toEqual('ehmpathy');

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

      then('stores key in daemon', async () => {
        daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);

        const vaultAdapter = genMockVaultAdapter({
          storage: { 'ehmpathy.sudo.ADMIN_TOKEN': secretValue },
        });

        const context: ContextKeyrackGrantUnlock = {
          hostManifest: manifest,
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

        await unlockKeyrackKeys({ env: 'sudo', key: 'ADMIN_TOKEN' }, context);

        // verify key is accessible from daemon
        const socketPath = getKeyrackDaemonSocketPath({ owner: null });
        const daemonResult = await daemonAccessGet({
          socketPath,
          slugs: ['ehmpathy.sudo.ADMIN_TOKEN'],
        });

        expect(daemonResult).not.toBeNull();
        expect(daemonResult?.keys.length).toBe(1);
        expect(daemonResult?.keys[0]?.key.secret).toEqual(secretValue);
        expect(daemonResult?.keys[0]?.env).toEqual('sudo');
      });
    });
  });

  given('[case2] regular credential with 9h default TTL', () => {
    const keyPair = useBeforeAll(async () => generateAgeKeyPair());
    const secretValue = 'api-key-value-456';

    const manifest = useBeforeAll(async () => {
      daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);

      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: keyPair.recipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case2.age',
          owner: 'case2',
          recipients: [recipient],
          hosts: {
            'ehmpathy.all.API_KEY': {
              slug: 'ehmpathy.all.API_KEY',
              mech: 'REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'all',
              org: 'ehmpathy',
              vaultRecipient: null,
              maxDuration: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      });
    });

    when('[t0] unlock called without --env (defaults to all)', () => {
      then('uses 9h default TTL', async () => {
        daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);

        const vaultAdapter = genMockVaultAdapter({
          storage: { 'ehmpathy.all.API_KEY': secretValue },
        });

        const context: ContextKeyrackGrantUnlock = {
          hostManifest: manifest,
          repoManifest: {
            org: 'ehmpathy',
            envs: [],
            keys: {
              'ehmpathy.all.API_KEY': {
                slug: 'ehmpathy.all.API_KEY',
                mech: 'REPLICA',
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

        const result = await unlockKeyrackKeys({ owner: 'case2' }, context);
        expect(result.unlocked.length).toBe(1);
        const key = result.unlocked[0]!;

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

  given('[case3] maxDuration caps TTL when duration is too long', () => {
    const keyPair = useBeforeAll(async () => generateAgeKeyPair());
    const secretValue = 'sensitive-value-789';

    const manifest = useBeforeAll(async () => {
      daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);

      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: keyPair.recipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case3.age',
          owner: 'case3',
          recipients: [recipient],
          hosts: {
            'ehmpathy.sudo.SENSITIVE_KEY': {
              slug: 'ehmpathy.sudo.SENSITIVE_KEY',
              mech: 'REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'sudo',
              org: 'ehmpathy',
              vaultRecipient: null,
              maxDuration: '5m',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      });
    });

    when('[t0] unlock called with duration that exceeds maxDuration', () => {
      then('caps TTL to maxDuration and warns', async () => {
        daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);

        const vaultAdapter = genMockVaultAdapter({
          storage: { 'ehmpathy.sudo.SENSITIVE_KEY': secretValue },
        });

        const context: ContextKeyrackGrantUnlock = {
          hostManifest: manifest,
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

        // capture console.warn
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const result = await unlockKeyrackKeys(
          { owner: 'case3', env: 'sudo', key: 'SENSITIVE_KEY', duration: '1h' },
          context,
        );

        expect(result.unlocked.length).toBe(1);
        const key = result.unlocked[0]!;

        // verify TTL is capped to 5 minutes (not 1 hour)
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

  given('[case4] custom duration within maxDuration limit', () => {
    const keyPair = useBeforeAll(async () => generateAgeKeyPair());
    const secretValue = 'custom-duration-value';

    const manifest = useBeforeAll(async () => {
      daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);

      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: keyPair.recipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case4.age',
          owner: 'case4',
          recipients: [recipient],
          hosts: {
            'ehmpathy.sudo.SHORT_LIVED_KEY': {
              slug: 'ehmpathy.sudo.SHORT_LIVED_KEY',
              mech: 'REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'sudo',
              org: 'ehmpathy',
              vaultRecipient: null,
              maxDuration: '1h',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      });
    });

    when('[t0] unlock called with duration below maxDuration', () => {
      then('uses requested duration', async () => {
        daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);

        const vaultAdapter = genMockVaultAdapter({
          storage: { 'ehmpathy.sudo.SHORT_LIVED_KEY': secretValue },
        });

        const context: ContextKeyrackGrantUnlock = {
          hostManifest: manifest,
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

        const result = await unlockKeyrackKeys(
          {
            owner: 'case4',
            env: 'sudo',
            key: 'SHORT_LIVED_KEY',
            duration: '15m',
          },
          context,
        );

        expect(result.unlocked.length).toBe(1);
        const key = result.unlocked[0]!;

        // verify TTL is approximately 15 minutes (not capped to maxDuration)
        const fifteenMinMs = 15 * 60 * 1000;
        expect(key.expiresAt).toBeDefined();
        const expiresAtMs = key.expiresAt
          ? new Date(key.expiresAt).getTime()
          : 0;
        const expiresIn = expiresAtMs - Date.now();
        expect(expiresIn).toBeGreaterThan(fifteenMinMs - 5000);
        expect(expiresIn).toBeLessThanOrEqual(fifteenMinMs);
      });
    });
  });

  given('[case5] per-owner isolation', () => {
    const keyPairA = useBeforeAll(async () => generateAgeKeyPair());
    const keyPairB = useBeforeAll(async () => generateAgeKeyPair());
    const secretValueA = 'owner-a-secret';
    const secretValueB = 'owner-b-secret';

    const manifestA = useBeforeAll(async () => {
      daoKeyrackHostManifest.setSessionIdentity(keyPairA.identity);

      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: keyPairA.recipient,
        label: 'test-key-a',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.ownerA.age',
          owner: 'ownerA',
          recipients: [recipient],
          hosts: {
            'ehmpathy.sudo.TOKEN_A': {
              slug: 'ehmpathy.sudo.TOKEN_A',
              mech: 'REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'sudo',
              org: 'ehmpathy',
              vaultRecipient: null,
              maxDuration: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      });
    });

    const manifestB = useBeforeAll(async () => {
      daoKeyrackHostManifest.setSessionIdentity(keyPairB.identity);

      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: keyPairB.recipient,
        label: 'test-key-b',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.ownerB.age',
          owner: 'ownerB',
          recipients: [recipient],
          hosts: {
            'ehmpathy.sudo.TOKEN_B': {
              slug: 'ehmpathy.sudo.TOKEN_B',
              mech: 'REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'sudo',
              org: 'ehmpathy',
              vaultRecipient: null,
              maxDuration: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      });
    });

    when('[t0] ownerA unlocks their key', () => {
      then('key is stored in ownerA daemon only', async () => {
        daoKeyrackHostManifest.setSessionIdentity(keyPairA.identity);

        const vaultAdapter = genMockVaultAdapter({
          storage: { 'ehmpathy.sudo.TOKEN_A': secretValueA },
        });

        const context: ContextKeyrackGrantUnlock = {
          hostManifest: manifestA,
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

        await unlockKeyrackKeys(
          { owner: 'ownerA', env: 'sudo', key: 'TOKEN_A' },
          context,
        );

        // verify key is in ownerA's daemon
        const socketPathA = getKeyrackDaemonSocketPath({ owner: 'ownerA' });
        const daemonResultA = await daemonAccessGet({
          socketPath: socketPathA,
          slugs: ['ehmpathy.sudo.TOKEN_A'],
        });
        expect(daemonResultA?.keys.length).toBe(1);
        expect(daemonResultA?.keys[0]?.key.secret).toEqual(secretValueA);

        // verify key is NOT in ownerB's daemon
        const socketPathB = getKeyrackDaemonSocketPath({ owner: 'ownerB' });
        const daemonResultB = await daemonAccessGet({
          socketPath: socketPathB,
          slugs: ['ehmpathy.sudo.TOKEN_A'],
        });
        // either null (daemon not started) or no keys
        expect(daemonResultB?.keys.length ?? 0).toBe(0);
      });
    });

    when('[t1] ownerB unlocks their key', () => {
      then('key is stored in ownerB daemon only', async () => {
        daoKeyrackHostManifest.setSessionIdentity(keyPairB.identity);

        const vaultAdapter = genMockVaultAdapter({
          storage: { 'ehmpathy.sudo.TOKEN_B': secretValueB },
        });

        const context: ContextKeyrackGrantUnlock = {
          hostManifest: manifestB,
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

        await unlockKeyrackKeys(
          { owner: 'ownerB', env: 'sudo', key: 'TOKEN_B' },
          context,
        );

        // verify key is in ownerB's daemon
        const socketPathB = getKeyrackDaemonSocketPath({ owner: 'ownerB' });
        const daemonResultB = await daemonAccessGet({
          socketPath: socketPathB,
          slugs: ['ehmpathy.sudo.TOKEN_B'],
        });
        expect(daemonResultB?.keys.length).toBe(1);
        expect(daemonResultB?.keys[0]?.key.secret).toEqual(secretValueB);

        // verify key is NOT in ownerA's daemon
        const socketPathA = getKeyrackDaemonSocketPath({ owner: 'ownerA' });
        const daemonResultA = await daemonAccessGet({
          socketPath: socketPathA,
          slugs: ['ehmpathy.sudo.TOKEN_B'],
        });
        // ownerA's daemon exists from previous test, but shouldn't have TOKEN_B
        expect(daemonResultA?.keys.length ?? 0).toBe(0);
      });
    });
  });
});
