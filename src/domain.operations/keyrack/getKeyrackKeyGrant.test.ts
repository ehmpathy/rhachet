import { given, then, when } from 'test-fns';

import { genMockMechAdapter } from '@src/.test/assets/genMockMechAdapter';

import { vaultAdapterOsEnvvar } from './adapters/vaults/os.envvar/vaultAdapterOsEnvvar';
import { daemonAccessGet } from './daemon/sdk';
import type { ContextKeyrackGrantGet } from './genContextKeyrackGrantGet';
import { getKeyrackKeyGrant } from './getKeyrackKeyGrant';

// mock daemon interactions to avoid socket access in unit tests
jest.mock('./daemon/sdk', () => ({
  daemonAccessGet: jest.fn().mockResolvedValue(null),
}));

const mechAdapters: ContextKeyrackGrantGet['mechAdapters'] = {
  PERMANENT_VIA_REPLICA: genMockMechAdapter(),
  PERMANENT_VIA_REFERENCE: genMockMechAdapter(),
  EPHEMERAL_VIA_SESSION: genMockMechAdapter(),
  EPHEMERAL_VIA_GITHUB_APP: genMockMechAdapter(),
  EPHEMERAL_VIA_AWS_SSO: genMockMechAdapter(),
  EPHEMERAL_VIA_GITHUB_OIDC: genMockMechAdapter(),
};

describe('getKeyrackKeyGrant', () => {
  beforeEach(() => {
    (daemonAccessGet as jest.Mock).mockResolvedValue(null);
  });

  given('[case1] key not in envvar or daemon and no vault file', () => {
    const context: ContextKeyrackGrantGet = {
      owner: null,
      repoManifest: null,
      envvarAdapter: vaultAdapterOsEnvvar,
      mechAdapters,
    };

    when('[t0] get called for single key', () => {
      then('status is absent (no vault file exists)', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'XAI_API_KEY' } },
          context,
        );
        expect(result.status).toEqual('absent');
      });

      then('fix mentions set', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'XAI_API_KEY' } },
          context,
        );
        if (result.status === 'absent') {
          expect(result.fix).toContain('set');
        }
      });
    });

    when('[t1] get called for repo with slugs', () => {
      then('result is array of absent attempts', async () => {
        const result = await getKeyrackKeyGrant(
          {
            for: { repo: true },
            slugs: ['testorg.test.KEY_A', 'testorg.test.KEY_B'],
          },
          context,
        );
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        expect(result[0]?.status).toEqual('absent');
        expect(result[1]?.status).toEqual('absent');
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

  given('[case4] key in both envvar and daemon (daemon wins)', () => {
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
      then('daemon takes precedence (os.daemon wins)', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: envSlug } },
          context,
        );
        expect(result.status).toEqual('granted');
        if (result.status === 'granted') {
          expect(result.grant.key.secret).toEqual('value-from-daemon');
          expect(result.grant.source.vault).toEqual('os.daemon');
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
        PERMANENT_VIA_REFERENCE: genMockMechAdapter(),
        EPHEMERAL_VIA_SESSION: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_APP: genMockMechAdapter(),
        EPHEMERAL_VIA_AWS_SSO: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_OIDC: genMockMechAdapter(),
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
        PERMANENT_VIA_REFERENCE: genMockMechAdapter(),
        EPHEMERAL_VIA_SESSION: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_APP: genMockMechAdapter(),
        EPHEMERAL_VIA_AWS_SSO: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_OIDC: genMockMechAdapter(),
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

  /**
   * .what = a reach-ask that no source can answer must REPORT absence, never throw
   * .why = this operation's whole contract is a status union — `granted` | `locked` |
   *        `absent` | `blocked`. absence is a VALUE it returns, so an exception thrown for
   *        the ordinary "no key here" case breaks the contract every caller relies on.
   *
   *        `fillKeyrackKeys` is the caller that proves it: it probes with this operation to
   *        decide whether a reach still needs provisioned. a throw there kills the whole
   *        `fill` run for a `require` reach — the exact scenario q8/q10 built the feature
   *        for — and is mis-reported as a skip for a `prefer` one.
   *
   *        os.envvar cannot hold a reach-key (a flat name drops org, env, and reach alike),
   *        so for a reach-ask it is an ABSENT SOURCE, not a refusal.
   */
  given('[case7] a reach-ask that no source can answer', () => {
    const reach = { exid: 'beav@ehmpathy.com' };
    const context: ContextKeyrackGrantGet = {
      owner: null,
      repoManifest: null,
      envvarAdapter: vaultAdapterOsEnvvar,
      mechAdapters,
    };

    when(
      '[t0] get is called with a reach and the daemon holds no such key',
      () => {
        then('it reports absence rather than throws', async () => {
          const result = await getKeyrackKeyGrant(
            { for: { key: 'XAI_API_KEY' }, reach },
            context,
          );
          expect(result.status).toEqual('absent');
        });

        then('the message names the reach, not the vault', async () => {
          const result = await getKeyrackKeyGrant(
            { for: { key: 'XAI_API_KEY' }, reach },
            context,
          );
          if (result.status === 'absent') {
            // the e6 report, reachable at last — it names WHAT is absent and why
            expect(result.message).toContain('beav@ehmpathy.com');
            expect(result.message).toContain('a reach is never derived');
            // never the vault's internal limitation, which no human can act on
            expect(result.message).not.toContain('os.envvar');
          }
        });

        then('the fix carries the reach through', async () => {
          const result = await getKeyrackKeyGrant(
            { for: { key: 'XAI_API_KEY' }, reach },
            context,
          );
          if (result.status === 'absent') {
            // a fix that dropped the reach would walk the human into the WRONG reach (e6)
            expect(result.fix).toContain('--reach beav@ehmpathy.com');
            expect(result.fix).toContain('keyrack set');
          }
        });
      },
    );

    when('[t1] the reachless variable IS present in the env', () => {
      const rawKey = '__TEST_KEYRACK_REACH_FALLTHROUGH__';
      const envSlug = `testorg.test.${rawKey}`;

      beforeEach(() => {
        process.env[rawKey] = 'sk-reachless-value-that-must-not-be-handed-back';
      });

      afterEach(() => {
        delete process.env[rawKey];
      });

      then(
        'the reach-ask is still absent — no reachless value substitutes (e18)',
        async () => {
          const result = await getKeyrackKeyGrant(
            { for: { key: envSlug }, reach },
            context,
          );
          expect(result.status).toEqual('absent');
        },
      );

      then('the reachless ask still reads it, unchanged (e1)', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: envSlug } },
          context,
        );
        expect(result.status).toEqual('granted');
      });
    });
  });
});
