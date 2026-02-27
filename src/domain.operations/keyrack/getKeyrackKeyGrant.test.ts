import { given, then, when } from 'test-fns';

import { genMockMechAdapter } from '@src/.test/assets/genMockMechAdapter';

import { vaultAdapterOsEnvvar } from './adapters/vaults/vaultAdapterOsEnvvar';
import { daemonAccessGet } from './daemon/sdk';
import type { ContextKeyrackGrantGet } from './genContextKeyrackGrantGet';
import { getKeyrackKeyGrant } from './getKeyrackKeyGrant';

// mock daemon interactions to avoid socket access in unit tests
jest.mock('./daemon/sdk', () => ({
  daemonAccessGet: jest.fn().mockResolvedValue(null),
}));

const mechAdapters: ContextKeyrackGrantGet['mechAdapters'] = {
  PERMANENT_VIA_REPLICA: genMockMechAdapter(),
  EPHEMERAL_VIA_GITHUB_APP: genMockMechAdapter(),
  EPHEMERAL_VIA_AWS_SSO: genMockMechAdapter(),
  EPHEMERAL_VIA_GITHUB_OIDC: genMockMechAdapter(),
  REPLICA: genMockMechAdapter(),
  GITHUB_APP: genMockMechAdapter(),
  AWS_SSO: genMockMechAdapter(),
};

describe('getKeyrackKeyGrant', () => {
  beforeEach(() => {
    (daemonAccessGet as jest.Mock).mockResolvedValue(null);
  });

  given('[case1] key not in envvar or daemon', () => {
    const context: ContextKeyrackGrantGet = {
      owner: null,
      repoManifest: null,
      envvarAdapter: vaultAdapterOsEnvvar,
      mechAdapters,
    };

    when('[t0] get called for single key', () => {
      then('status is locked', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'XAI_API_KEY' } },
          context,
        );
        expect(result.status).toEqual('locked');
      });

      then('fix mentions unlock', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'XAI_API_KEY' } },
          context,
        );
        if (result.status === 'locked') {
          expect(result.fix).toContain('unlock');
        }
      });
    });

    when('[t1] get called for repo with slugs', () => {
      then('result is array of locked attempts', async () => {
        const result = await getKeyrackKeyGrant(
          {
            for: { repo: true },
            slugs: ['testorg.test.KEY_A', 'testorg.test.KEY_B'],
          },
          context,
        );
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        expect(result[0]?.status).toEqual('locked');
        expect(result[1]?.status).toEqual('locked');
      });
    });
  });

  given('[case2] key found in daemon', () => {
    const context: ContextKeyrackGrantGet = {
      owner: null,
      repoManifest: null,
      envvarAdapter: vaultAdapterOsEnvvar,
      mechAdapters,
    };

    when('[t0] get called for key cached in daemon', () => {
      then('status is granted', async () => {
        (daemonAccessGet as jest.Mock).mockResolvedValue({
          keys: [
            {
              slug: 'testorg.test.DAEMON_KEY',
              key: {
                secret: 'daemon-secret-value',
                grade: { protection: 'encrypted', duration: 'permanent' },
              },
              source: { vault: 'os.daemon', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'test',
              org: 'testorg',
            },
          ],
        });

        const result = await getKeyrackKeyGrant(
          { for: { key: 'testorg.test.DAEMON_KEY' } },
          context,
        );
        expect(result.status).toEqual('granted');
      });

      then('grant source vault is os.daemon', async () => {
        (daemonAccessGet as jest.Mock).mockResolvedValue({
          keys: [
            {
              slug: 'testorg.test.DAEMON_KEY',
              key: {
                secret: 'daemon-secret-value',
                grade: { protection: 'encrypted', duration: 'permanent' },
              },
              source: { vault: 'os.daemon', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'test',
              org: 'testorg',
            },
          ],
        });

        const result = await getKeyrackKeyGrant(
          { for: { key: 'testorg.test.DAEMON_KEY' } },
          context,
        );
        if (result.status === 'granted') {
          expect(result.grant.source.vault).toEqual('os.daemon');
        }
      });

      then('grant value matches daemon value', async () => {
        (daemonAccessGet as jest.Mock).mockResolvedValue({
          keys: [
            {
              slug: 'testorg.test.DAEMON_KEY',
              key: {
                secret: 'daemon-secret-value',
                grade: { protection: 'encrypted', duration: 'permanent' },
              },
              source: { vault: 'os.daemon', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'test',
              org: 'testorg',
            },
          ],
        });

        const result = await getKeyrackKeyGrant(
          { for: { key: 'testorg.test.DAEMON_KEY' } },
          context,
        );
        if (result.status === 'granted') {
          expect(result.grant.key.secret).toEqual('daemon-secret-value');
        }
      });
    });
  });

  given('[case3] key present in process.env', () => {
    const rawKey = '__TEST_KEYRACK_ENV_VAR__';
    const envSlug = `testorg.test.${rawKey}`;
    const envValue = 'test-env-value-from-os';

    beforeEach(() => {
      process.env[rawKey] = envValue;
    });

    afterEach(() => {
      delete process.env[rawKey];
    });

    const context: ContextKeyrackGrantGet = {
      owner: null,
      repoManifest: null,
      envvarAdapter: vaultAdapterOsEnvvar,
      mechAdapters,
    };

    when('[t0] get called for key that exists in env', () => {
      then('status is granted', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: envSlug } },
          context,
        );
        expect(result.status).toEqual('granted');
      });

      then('grant source vault is os.envvar', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: envSlug } },
          context,
        );
        if (result.status === 'granted') {
          expect(result.grant.source.vault).toEqual('os.envvar');
        }
      });

      then('grant value matches env value', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: envSlug } },
          context,
        );
        if (result.status === 'granted') {
          expect(result.grant.key.secret).toEqual(envValue);
        }
      });
    });
  });

  given('[case4] key in both envvar and daemon (envvar wins)', () => {
    const rawKey = '__TEST_KEYRACK_ENV_VAR_PRIORITY__';
    const envSlug = `testorg.test.${rawKey}`;
    const envValue = 'value-from-env';

    beforeEach(() => {
      process.env[rawKey] = envValue;
      (daemonAccessGet as jest.Mock).mockResolvedValue({
        keys: [
          {
            slug: envSlug,
            key: {
              secret: 'value-from-daemon',
              grade: { protection: 'encrypted', duration: 'permanent' },
            },
            source: { vault: 'os.daemon', mech: 'PERMANENT_VIA_REPLICA' },
            env: 'test',
            org: 'testorg',
          },
        ],
      });
    });

    afterEach(() => {
      delete process.env[rawKey];
    });

    const context: ContextKeyrackGrantGet = {
      owner: null,
      repoManifest: null,
      envvarAdapter: vaultAdapterOsEnvvar,
      mechAdapters,
    };

    when('[t0] get called for key', () => {
      then('env takes precedence (os.envvar wins)', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: envSlug } },
          context,
        );
        expect(result.status).toEqual('granted');
        if (result.status === 'granted') {
          expect(result.grant.key.secret).toEqual(envValue);
          expect(result.grant.source.vault).toEqual('os.envvar');
        }
      });
    });
  });

  given('[case5] key in daemon fails mechanism validation (firewall)', () => {
    const context: ContextKeyrackGrantGet = {
      owner: null,
      repoManifest: null,
      envvarAdapter: vaultAdapterOsEnvvar,
      mechAdapters: {
        PERMANENT_VIA_REPLICA: genMockMechAdapter({
          valid: false,
          invalidReason: 'ghp_ token blocked by firewall',
        }),
        EPHEMERAL_VIA_GITHUB_APP: genMockMechAdapter(),
        EPHEMERAL_VIA_AWS_SSO: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_OIDC: genMockMechAdapter(),
        REPLICA: genMockMechAdapter({
          valid: false,
          invalidReason: 'ghp_ token blocked by firewall',
        }),
        GITHUB_APP: genMockMechAdapter(),
        AWS_SSO: genMockMechAdapter(),
      },
    };

    when('[t0] get called for key cached in daemon with bad value', () => {
      then('status is blocked', async () => {
        (daemonAccessGet as jest.Mock).mockResolvedValue({
          keys: [
            {
              slug: 'testorg.test.GHP_TOKEN',
              key: {
                secret: 'ghp_abcdefghijklmnopqrstuvwxyz1234567890',
                grade: { protection: 'encrypted', duration: 'permanent' },
              },
              source: { vault: 'os.daemon', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'test',
              org: 'testorg',
            },
          ],
        });

        const result = await getKeyrackKeyGrant(
          { for: { key: 'testorg.test.GHP_TOKEN' } },
          context,
        );
        expect(result.status).toEqual('blocked');
      });

      then('message mentions firewall reason', async () => {
        (daemonAccessGet as jest.Mock).mockResolvedValue({
          keys: [
            {
              slug: 'testorg.test.GHP_TOKEN',
              key: {
                secret: 'ghp_abcdefghijklmnopqrstuvwxyz1234567890',
                grade: { protection: 'encrypted', duration: 'permanent' },
              },
              source: { vault: 'os.daemon', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'test',
              org: 'testorg',
            },
          ],
        });

        const result = await getKeyrackKeyGrant(
          { for: { key: 'testorg.test.GHP_TOKEN' } },
          context,
        );
        if (result.status === 'blocked') {
          expect(result.reasons?.join(' ')).toContain(
            'ghp_ token blocked by firewall',
          );
        }
      });
    });
  });

  given('[case6] key in env fails mechanism validation', () => {
    const rawKey = '__TEST_KEYRACK_ENV_VAR_BLOCKED__';
    const envSlug = `testorg.test.${rawKey}`;
    const envValue = 'invalid-value-that-fails-firewall';

    beforeEach(() => {
      process.env[rawKey] = envValue;
    });

    afterEach(() => {
      delete process.env[rawKey];
    });

    const context: ContextKeyrackGrantGet = {
      owner: null,
      repoManifest: null,
      envvarAdapter: vaultAdapterOsEnvvar,
      mechAdapters: {
        PERMANENT_VIA_REPLICA: genMockMechAdapter({
          valid: false,
          invalidReason: 'long-lived credential blocked',
        }),
        EPHEMERAL_VIA_GITHUB_APP: genMockMechAdapter(),
        EPHEMERAL_VIA_AWS_SSO: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_OIDC: genMockMechAdapter(),
        REPLICA: genMockMechAdapter({
          valid: false,
          invalidReason: 'long-lived credential blocked',
        }),
        GITHUB_APP: genMockMechAdapter(),
        AWS_SSO: genMockMechAdapter(),
      },
    };

    when('[t0] get called for key with invalid env value', () => {
      then('status is blocked', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: envSlug } },
          context,
        );
        expect(result.status).toEqual('blocked');
      });

      then('message mentions firewall reason', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: envSlug } },
          context,
        );
        if (result.status === 'blocked') {
          expect(result.reasons?.join(' ')).toContain(
            'long-lived credential blocked',
          );
        }
      });
    });
  });
});
