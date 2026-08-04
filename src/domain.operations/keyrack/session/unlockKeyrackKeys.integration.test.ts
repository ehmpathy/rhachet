/**
 * .what = every case here injects `genMockVaultAdapter` as its vault
 * .why = `rule.forbid.integration.mocks` asks that a test double in an integration
 * test be documented as unavoidable. two facts settle it for this file:
 *
 *   1. it is an INJECTED FAKE, not a module mock. `genMockVaultAdapter` is a real
 *      in-memory implementation of the `KeyrackHostVaultAdapter` interface, handed in
 *      through `context.vaultAdapters`. there is no `jest.mock()` anywhere in this
 *      file. the rule's own remedy for a mock is exactly this pair — "fakes:
 *      simplified implementations that behave like the real dependency" plus
 *      "dependency injection: pass the dependency as a parameter". the NAME says
 *      mock; the shape is a fake. (filed to the council: rename it `genFakeVault*`,
 *      so the label stops reading as the defect the rule forbids.)
 *
 *   2. the real vaults are unreachable from a test by construction. the seven
 *      adapters this operation dispatches over are the host keychain, 1password,
 *      an aws sso browser round trip, github secrets, and the daemon itself. each
 *      needs an interactive human — a yubikey touch, an sso approval, a keychain
 *      prompt — and several would MUTATE the developer's real credential store.
 *      an integration test that writes to the host keychain is not a stronger test;
 *      it is a destructive one.
 *
 * .what-IS-real = the boundary this file actually integrates against is the DAEMON,
 * and none of it is faked: real unix sockets in the real `XDG_RUNTIME_DIR`, real
 * spawned daemon processes, real `age` keypairs, a real host manifest written to a
 * real temp HOME. the vault is faked precisely so the daemon can be real — every
 * assertion below reads daemon state, never vault state.
 */
import { MalfunctionError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genMockKeyrackRepoManifest } from '@src/.test/assets/genMockKeyrackRepoManifest';
import { genMockVaultAdapter } from '@src/.test/assets/genMockVaultAdapter';
import { withTempHome } from '@src/.test/infra/withTempHome';
import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import {
  KeyrackHostManifest,
  KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';
import { generateAgeKeyPair } from '@src/domain.operations/keyrack/adapters/ageRecipientCrypto';
import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';
import { daemonAccessGet } from '@src/domain.operations/keyrack/daemon/sdk';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';

import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { unlockKeyrackKeys } from './unlockKeyrackKeys';

describe('unlockKeyrackKeys.integration', () => {
  const tempHome = withTempHome({ name: 'unlockKeyrackKeys-integration' });

  beforeAll(() => tempHome.setup());
  afterAll(() => tempHome.teardown());

  beforeEach(() => {
    // session identity removed - use _testIdentity in get()
  });

  given('[case1] sudo credential with 30min default TTL', () => {
    const keyPair = useBeforeAll(async () => generateAgeKeyPair());
    const secretValue = 'sudo-secret-value-123';

    const manifest = useBeforeAll(async () => {
      // identity is passed via _testIdentity in get()

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
              mech: 'PERMANENT_VIA_REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'sudo',
              org: 'ehmpathy',
              meta: null,
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
        // identity is passed via _testIdentity in get()

        const vaultAdapter = genMockVaultAdapter({
          storage: { 'ehmpathy.sudo.ADMIN_TOKEN': secretValue },
        });

        const context: ContextKeyrack = {
          owner: null,
          identity: {
            getOne: async () => 'test-identity',
            getAll: {
              discovered: async () => ['test-identity'],
              prescribed: [],
            },
          },
          hostManifest: manifest,
          repoManifest: genMockKeyrackRepoManifest({ org: 'ehmpathy' }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': vaultAdapter,
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.config': genMockVaultAdapter(),
            'aws.params': genMockVaultAdapter(),
            'github.secrets': genMockVaultAdapter(),
          },
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
        // identity is passed via _testIdentity in get()

        const vaultAdapter = genMockVaultAdapter({
          storage: { 'ehmpathy.sudo.ADMIN_TOKEN': secretValue },
        });

        const context: ContextKeyrack = {
          owner: null,
          identity: {
            getOne: async () => 'test-identity',
            getAll: {
              discovered: async () => ['test-identity'],
              prescribed: [],
            },
          },
          hostManifest: manifest,
          repoManifest: genMockKeyrackRepoManifest({ org: 'ehmpathy' }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': vaultAdapter,
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.config': genMockVaultAdapter(),
            'aws.params': genMockVaultAdapter(),
            'github.secrets': genMockVaultAdapter(),
          },
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

  given('[case1b] sudo credential filters by repo org', () => {
    const keyPair = useBeforeAll(async () => generateAgeKeyPair());
    const secretValueEhmpathy = 'ehmpathy-sudo-secret';
    const secretValueAhbode = 'ahbode-sudo-secret';

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: keyPair.recipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      // host manifest has sudo keys for two different orgs
      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.age',
          owner: null,
          recipients: [recipient],
          hosts: {
            'ehmpathy.sudo.AWS_PROFILE': {
              slug: 'ehmpathy.sudo.AWS_PROFILE',
              mech: 'PERMANENT_VIA_REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'sudo',
              org: 'ehmpathy',
              meta: null,
              maxDuration: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            'ahbode.sudo.AWS_PROFILE': {
              slug: 'ahbode.sudo.AWS_PROFILE',
              mech: 'PERMANENT_VIA_REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'sudo',
              org: 'ahbode',
              meta: null,
              maxDuration: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      });
    });

    when('[t0] unlock called with repo org = ehmpathy', () => {
      then('unlocks only ehmpathy sudo key, not ahbode', async () => {
        const vaultAdapter = genMockVaultAdapter({
          storage: {
            'ehmpathy.sudo.AWS_PROFILE': secretValueEhmpathy,
            'ahbode.sudo.AWS_PROFILE': secretValueAhbode,
          },
        });

        const context: ContextKeyrack = {
          owner: null,
          identity: {
            getOne: async () => 'test-identity',
            getAll: {
              discovered: async () => ['test-identity'],
              prescribed: [],
            },
          },
          hostManifest: manifest,
          repoManifest: genMockKeyrackRepoManifest({ org: 'ehmpathy' }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': vaultAdapter,
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.config': genMockVaultAdapter(),
            'aws.params': genMockVaultAdapter(),
            'github.secrets': genMockVaultAdapter(),
          },
        };

        const result = await unlockKeyrackKeys(
          { env: 'sudo', key: 'AWS_PROFILE' },
          context,
        );

        // should unlock only the ehmpathy key, not ahbode
        expect(result.unlocked.length).toBe(1);
        expect(result.unlocked[0]?.slug).toBe('ehmpathy.sudo.AWS_PROFILE');

        // verify only ehmpathy key accessible from daemon
        const socketPath = getKeyrackDaemonSocketPath({ owner: null });
        const daemonResult = await daemonAccessGet({
          socketPath,
          slugs: ['ehmpathy.sudo.AWS_PROFILE', 'ahbode.sudo.AWS_PROFILE'],
        });

        expect(daemonResult).not.toBeNull();
        expect(daemonResult?.keys.length).toBe(1);
        expect(daemonResult?.keys[0]?.slug).toBe('ehmpathy.sudo.AWS_PROFILE');
        expect(daemonResult?.keys[0]?.key.secret).toEqual(secretValueEhmpathy);
      });
    });
  });

  given('[case2] regular credential with 9h default TTL', () => {
    const keyPair = useBeforeAll(async () => generateAgeKeyPair());
    const secretValue = 'api-key-value-456';

    const manifest = useBeforeAll(async () => {
      // identity is passed via _testIdentity in get()

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
              mech: 'PERMANENT_VIA_REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'all',
              org: 'ehmpathy',
              meta: null,
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
        // identity is passed via _testIdentity in get()

        const vaultAdapter = genMockVaultAdapter({
          storage: { 'ehmpathy.all.API_KEY': secretValue },
        });

        const context: ContextKeyrack = {
          owner: 'case2',
          identity: {
            getOne: async () => 'test-identity',
            getAll: {
              discovered: async () => ['test-identity'],
              prescribed: [],
            },
          },
          hostManifest: manifest,
          repoManifest: genMockKeyrackRepoManifest({
            org: 'ehmpathy',
            keys: { 'ehmpathy.all.API_KEY': {} },
          }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': vaultAdapter,
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.config': genMockVaultAdapter(),
            'aws.params': genMockVaultAdapter(),
            'github.secrets': genMockVaultAdapter(),
          },
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
      // identity is passed via _testIdentity in get()

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
              mech: 'PERMANENT_VIA_REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'sudo',
              org: 'ehmpathy',
              meta: null,
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
        // identity is passed via _testIdentity in get()

        const vaultAdapter = genMockVaultAdapter({
          storage: { 'ehmpathy.sudo.SENSITIVE_KEY': secretValue },
        });

        const context: ContextKeyrack = {
          owner: 'case3',
          identity: {
            getOne: async () => 'test-identity',
            getAll: {
              discovered: async () => ['test-identity'],
              prescribed: [],
            },
          },
          hostManifest: manifest,
          repoManifest: genMockKeyrackRepoManifest({ org: 'ehmpathy' }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': vaultAdapter,
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.config': genMockVaultAdapter(),
            'aws.params': genMockVaultAdapter(),
            'github.secrets': genMockVaultAdapter(),
          },
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
      // identity is passed via _testIdentity in get()

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
              mech: 'PERMANENT_VIA_REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'sudo',
              org: 'ehmpathy',
              meta: null,
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
        // identity is passed via _testIdentity in get()

        const vaultAdapter = genMockVaultAdapter({
          storage: { 'ehmpathy.sudo.SHORT_LIVED_KEY': secretValue },
        });

        const context: ContextKeyrack = {
          owner: 'case4',
          identity: {
            getOne: async () => 'test-identity',
            getAll: {
              discovered: async () => ['test-identity'],
              prescribed: [],
            },
          },
          hostManifest: manifest,
          repoManifest: genMockKeyrackRepoManifest({ org: 'ehmpathy' }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': vaultAdapter,
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.config': genMockVaultAdapter(),
            'aws.params': genMockVaultAdapter(),
            'github.secrets': genMockVaultAdapter(),
          },
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
              mech: 'PERMANENT_VIA_REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'sudo',
              org: 'ehmpathy',
              meta: null,
              maxDuration: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      });
    });

    const manifestB = useBeforeAll(async () => {
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
              mech: 'PERMANENT_VIA_REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'sudo',
              org: 'ehmpathy',
              meta: null,
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
        const vaultAdapter = genMockVaultAdapter({
          storage: { 'ehmpathy.sudo.TOKEN_A': secretValueA },
        });

        const context: ContextKeyrack = {
          owner: 'ownerA',
          identity: {
            getOne: async () => 'test-identity',
            getAll: {
              discovered: async () => ['test-identity'],
              prescribed: [],
            },
          },
          hostManifest: manifestA,
          repoManifest: genMockKeyrackRepoManifest({ org: 'ehmpathy' }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': vaultAdapter,
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.config': genMockVaultAdapter(),
            'aws.params': genMockVaultAdapter(),
            'github.secrets': genMockVaultAdapter(),
          },
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
        const vaultAdapter = genMockVaultAdapter({
          storage: { 'ehmpathy.sudo.TOKEN_B': secretValueB },
        });

        const context: ContextKeyrack = {
          owner: 'ownerB',
          identity: {
            getOne: async () => 'test-identity',
            getAll: {
              discovered: async () => ['test-identity'],
              prescribed: [],
            },
          },
          hostManifest: manifestB,
          repoManifest: genMockKeyrackRepoManifest({ org: 'ehmpathy' }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': vaultAdapter,
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.config': genMockVaultAdapter(),
            'aws.params': genMockVaultAdapter(),
            'github.secrets': genMockVaultAdapter(),
          },
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

  given('[case6] every key omitted, so none reach the daemon', () => {
    // .why = an unlock that grants zero keys must not leave a daemon behind. the
    // findsert sits inside the `keysToUnlock.length > 0` branch precisely so this
    // path spawns none — a leak closed at its source rather than by expiry.
    // .note = this case uses its own owner so its socket path is untouched by the
    // cases above, which each spawn a daemon of their own
    const ownerNoKeys = 'ownernokeys';
    const keyPair = useBeforeAll(async () => generateAgeKeyPair());

    // reap a daemon at this path, whether or not one should be here
    // .why = when the regression this case clamps is present, the unlock DOES
    // spawn a daemon — so a red run of this very case leaks one, and its orphaned
    // socket would then fail the next run's precondition. observed for real
    const reapOwnDaemon = () => {
      const socketPath = getKeyrackDaemonSocketPath({ owner: ownerNoKeys });
      const pidPath = socketPath.replace(/\.sock$/, '.pid');
      if (existsSync(pidPath)) {
        try {
          process.kill(parseInt(readFileSync(pidPath, 'utf-8'), 10), 'SIGTERM');
        } catch (error) {
          // allow expected errors: ESRCH = no such process (already dead)
          if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
        }
        unlinkSync(pidPath);
      }
      if (existsSync(socketPath)) unlinkSync(socketPath);
    };

    beforeAll(reapOwnDaemon);
    afterAll(reapOwnDaemon);

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: keyPair.recipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.age',
          owner: ownerNoKeys,
          recipients: [recipient],
          hosts: {
            'ehmpathy.sudo.GONE_TOKEN': {
              slug: 'ehmpathy.sudo.GONE_TOKEN',
              mech: 'PERMANENT_VIA_REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'sudo',
              org: 'ehmpathy',
              meta: null,
              maxDuration: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      });
    });

    when('[t0] the vault no longer holds the only configured key', () => {
      then('the unlock omits it and spawns no daemon', async () => {
        // an empty vault makes adapter.get return null, so the key is omitted
        // as 'lost' and keysToUnlock stays empty
        // .why-faked = see the file header for the general case. THIS case needs
        // one more thing of its vault: a deterministic MISS. e17 is the claim that
        // an unlock which grants zero keys spawns no daemon, so the vault must
        // reliably fail to answer for a key the manifest declares. against a real
        // vault that state is unreachable without a mutation of the host store —
        // to prove the absence, we would have to create the absence
        const context: ContextKeyrack = {
          owner: ownerNoKeys,
          identity: {
            getOne: async () => 'test-identity',
            getAll: {
              discovered: async () => ['test-identity'],
              prescribed: [],
            },
          },
          hostManifest: manifest,
          repoManifest: genMockKeyrackRepoManifest({ org: 'ehmpathy' }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': genMockVaultAdapter({ storage: {} }),
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.config': genMockVaultAdapter(),
            'github.secrets': genMockVaultAdapter(),
          },
        };

        const socketPath = getKeyrackDaemonSocketPath({ owner: ownerNoKeys });
        expect(existsSync(socketPath)).toBe(false);

        const result = await unlockKeyrackKeys(
          { owner: ownerNoKeys, env: 'sudo', key: 'GONE_TOKEN' },
          context,
        );

        expect(result.unlocked.length).toBe(0);
        expect(result.omitted.map((one) => one.reason)).toEqual(['lost']);

        // the clamp: no socket, so no daemon was spawned for a session that
        // established no keys. with the findsert at the top of the operation
        // this file would exist, and its daemon would hold zero keys forever
        expect(existsSync(socketPath)).toBe(false);
      });
    });
  });

  given('[case7] a vault slower to unlock than the daemon idle window', () => {
    // .why = this clamps acceptance #2 — "the race the original guard prevented
    // does NOT return". that race is spawn -> first-served-command, and the real
    // vault flow between them is interactive and human-paced: yubikey, sso, a
    // browser round trip, each with ~3min timeouts, looped once per key. with the
    // findsert at the TOP of the operation a fresh daemon must survive that whole
    // flow on startup grace alone; moved to just before the send, the window is
    // milliseconds. this case makes the vault slower than the idle window, so the
    // two orders give opposite outcomes and the clamp has teeth.
    jest.setTimeout(30000);

    const ownerSlowVault = 'ownerslowvault';
    const slugSlowVault = 'ehmpathy.sudo.SLOW_TOKEN';
    const secretSlowVault = 'slow-vault-secret';
    const keyPair = useBeforeAll(async () => generateAgeKeyPair());

    const reapOwnDaemon = () => {
      const socketPath = getKeyrackDaemonSocketPath({ owner: ownerSlowVault });
      const pidPath = socketPath.replace(/\.sock$/, '.pid');
      if (existsSync(pidPath)) {
        try {
          process.kill(parseInt(readFileSync(pidPath, 'utf-8'), 10), 'SIGTERM');
        } catch (error) {
          // allow expected errors: ESRCH = no such process (already dead)
          if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
        }
        unlinkSync(pidPath);
      }
      if (existsSync(socketPath)) unlinkSync(socketPath);
    };

    beforeAll(reapOwnDaemon);
    afterAll(() => {
      delete process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'];
      delete process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'];
      reapOwnDaemon();
    });

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: keyPair.recipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.age',
          owner: ownerSlowVault,
          recipients: [recipient],
          hosts: {
            [slugSlowVault]: {
              slug: slugSlowVault,
              mech: 'PERMANENT_VIA_REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'sudo',
              org: 'ehmpathy',
              meta: null,
              maxDuration: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      });
    });

    when('[t0] the vault takes several idle windows to answer', () => {
      then('the key still reaches the daemon', async () => {
        // a 2s idle window against a 6s vault: the daemon cannot survive the
        // vault flow on startup grace, so it must not be spawned before it
        process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'] = '200';
        process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'] = '2000';

        // .why-faked = see the file header for the general case. THIS case needs
        // one more thing of its vault: a CONTROLLED LATENCY. the race it clamps is
        // spawn -> first-served-command, and its width is set by how long the vault
        // takes. a real vault's latency is a human at a yubikey — unbounded above,
        // near-zero when a token is cached, and never the same twice. a fake whose
        // delay is a named number is what turns a race into an assertion; a real
        // vault here would make this case a coin flip
        // wrap the fake vault so its read is slower than three idle windows
        const vaultFast = genMockVaultAdapter({
          storage: { [slugSlowVault]: secretSlowVault },
        });
        // pin .get before we wrap it — the adapter contract types it as nullable
        // .why = a wrapper that quietly no-ops when the method is absent would let
        // this case pass for the wrong reason: the vault would answer at once
        // rather than slowly, and the race it clamps would never be run at all
        const getFast =
          vaultFast.get ??
          MalfunctionError.throw('mock vault adapter has no get method');
        const vaultSlow = {
          ...vaultFast,
          get: async (...args: Parameters<typeof getFast>) => {
            await new Promise<void>((emit) => setTimeout(emit, 6000));
            return getFast(...args);
          },
        };

        const context: ContextKeyrack = {
          owner: ownerSlowVault,
          identity: {
            getOne: async () => 'test-identity',
            getAll: {
              discovered: async () => ['test-identity'],
              prescribed: [],
            },
          },
          hostManifest: manifest,
          repoManifest: genMockKeyrackRepoManifest({ org: 'ehmpathy' }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': vaultSlow,
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.config': genMockVaultAdapter(),
            'github.secrets': genMockVaultAdapter(),
          },
        };

        const result = await unlockKeyrackKeys(
          { owner: ownerSlowVault, env: 'sudo', key: 'SLOW_TOKEN' },
          context,
        );
        expect(result.unlocked.length).toBe(1);

        // the clamp: the daemon actually holds the key. move the findsert back
        // to the top of the operation and the daemon spawns before the 6s vault
        // read, idles out at 2s, unlinks its socket — so the UNLOCK that follows
        // reaches no one and this read finds no key
        const socketPath = getKeyrackDaemonSocketPath({
          owner: ownerSlowVault,
        });
        const daemonResult = await daemonAccessGet({
          socketPath,
          slugs: [slugSlowVault],
        });
        expect(daemonResult?.keys.length).toBe(1);
        expect(daemonResult?.keys[0]?.key.secret).toEqual(secretSlowVault);

        delete process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'];
        delete process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'];
      });
    });
  });
});
