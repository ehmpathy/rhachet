import { given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';
import { genMockKeyrackRepoManifest } from '@src/.test/assets/genMockKeyrackRepoManifest';
import { genMockMechAdapter } from '@src/.test/assets/genMockMechAdapter';
import { genMockVaultAdapter } from '@src/.test/assets/genMockVaultAdapter';

import { vaultAdapterOsEnvvar } from './adapters/vaults/vaultAdapterOsEnvvar';
import type { KeyrackGrantContext } from './genKeyrackGrantContext';
import { getKeyrackKeyGrant } from './getKeyrackKeyGrant';

describe('getKeyrackKeyGrant', () => {
  given('[case1] key found in repo manifest and host manifest', () => {
    const context: KeyrackGrantContext = {
      repoManifest: genMockKeyrackRepoManifest({
        keys: { XAI_API_KEY: { mech: 'REPLICA' } },
      }),
      hostManifest: genMockKeyrackHostManifest({
        hosts: { XAI_API_KEY: { mech: 'REPLICA', vault: 'os.direct' } },
      }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter({
          isUnlocked: true,
          storage: { XAI_API_KEY: 'test-api-key-123' },
        }),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
      mechAdapters: {
        PERMANENT_VIA_REPLICA: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_APP: genMockMechAdapter(),
        EPHEMERAL_VIA_AWS_SSO: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_OIDC: genMockMechAdapter(),
        REPLICA: genMockMechAdapter(),
        GITHUB_APP: genMockMechAdapter(),
        AWS_SSO: genMockMechAdapter(),
      },
    };

    when('[t0] get called for single key', () => {
      then('status is granted', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'XAI_API_KEY' } },
          context,
        );
        expect(result.status).toEqual('granted');
      });

      then('grant value matches stored value', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'XAI_API_KEY' } },
          context,
        );
        if (result.status === 'granted') {
          expect(result.grant.key.secret).toEqual('test-api-key-123');
        }
      });

      then('grant slug matches requested key', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'XAI_API_KEY' } },
          context,
        );
        if (result.status === 'granted') {
          expect(result.grant.slug).toEqual('XAI_API_KEY');
        }
      });
    });

    when('[t1] get called for repo', () => {
      then('result is array', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { repo: true } },
          context,
        );
        expect(Array.isArray(result)).toBe(true);
      });

      then('result contains granted status', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { repo: true } },
          context,
        );
        expect(result[0]?.status).toEqual('granted');
      });
    });
  });

  given('[case2] key not found in repo manifest', () => {
    const context: KeyrackGrantContext = {
      repoManifest: genMockKeyrackRepoManifest({ keys: {} }),
      hostManifest: genMockKeyrackHostManifest({
        hosts: { XAI_API_KEY: { mech: 'REPLICA', vault: 'os.direct' } },
      }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
      mechAdapters: {
        PERMANENT_VIA_REPLICA: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_APP: genMockMechAdapter(),
        EPHEMERAL_VIA_AWS_SSO: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_OIDC: genMockMechAdapter(),
        REPLICA: genMockMechAdapter(),
        GITHUB_APP: genMockMechAdapter(),
        AWS_SSO: genMockMechAdapter(),
      },
    };

    when('[t0] get called for key not in repo manifest', () => {
      then('status is absent', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'XAI_API_KEY' } },
          context,
        );
        expect(result.status).toEqual('absent');
      });

      then('message mentions repo manifest', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'XAI_API_KEY' } },
          context,
        );
        if (result.status === 'absent') {
          expect(result.message).toContain('repo manifest');
        }
      });
    });
  });

  given('[case3] key not configured on host', () => {
    const context: KeyrackGrantContext = {
      repoManifest: genMockKeyrackRepoManifest({
        keys: { XAI_API_KEY: { mech: 'REPLICA' } },
      }),
      hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
      mechAdapters: {
        PERMANENT_VIA_REPLICA: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_APP: genMockMechAdapter(),
        EPHEMERAL_VIA_AWS_SSO: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_OIDC: genMockMechAdapter(),
        REPLICA: genMockMechAdapter(),
        GITHUB_APP: genMockMechAdapter(),
        AWS_SSO: genMockMechAdapter(),
      },
    };

    when('[t0] get called for key not on host', () => {
      then('status is absent', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'XAI_API_KEY' } },
          context,
        );
        expect(result.status).toEqual('absent');
      });

      then('message mentions host', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'XAI_API_KEY' } },
          context,
        );
        if (result.status === 'absent') {
          expect(result.message).toContain('host');
        }
      });

      then('fix instructions mention keyrack set', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'XAI_API_KEY' } },
          context,
        );
        if (result.status === 'absent') {
          expect(result.fix).toContain('keyrack set');
        }
      });
    });
  });

  given('[case4] vault is locked', () => {
    const context: KeyrackGrantContext = {
      repoManifest: genMockKeyrackRepoManifest({
        keys: { XAI_API_KEY: { mech: 'REPLICA' } },
      }),
      hostManifest: genMockKeyrackHostManifest({
        hosts: { XAI_API_KEY: { mech: 'REPLICA', vault: 'os.direct' } },
      }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter({ isUnlocked: false }),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
      mechAdapters: {
        PERMANENT_VIA_REPLICA: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_APP: genMockMechAdapter(),
        EPHEMERAL_VIA_AWS_SSO: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_OIDC: genMockMechAdapter(),
        REPLICA: genMockMechAdapter(),
        GITHUB_APP: genMockMechAdapter(),
        AWS_SSO: genMockMechAdapter(),
      },
    };

    when('[t0] get called with locked vault', () => {
      then('status is locked', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'XAI_API_KEY' } },
          context,
        );
        expect(result.status).toEqual('locked');
      });

      then('fix instructions mention unlock', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'XAI_API_KEY' } },
          context,
        );
        if (result.status === 'locked') {
          expect(result.fix).toContain('unlock');
        }
      });
    });
  });

  given('[case5] mechanism validation fails', () => {
    const context: KeyrackGrantContext = {
      repoManifest: genMockKeyrackRepoManifest({
        keys: { XAI_API_KEY: { mech: 'REPLICA' } },
      }),
      hostManifest: genMockKeyrackHostManifest({
        hosts: { XAI_API_KEY: { mech: 'REPLICA', vault: 'os.direct' } },
      }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter({
          isUnlocked: true,
          storage: { XAI_API_KEY: 'bad-value' },
        }),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
      mechAdapters: {
        PERMANENT_VIA_REPLICA: genMockMechAdapter({
          valid: false,
          invalidReason: 'value format is invalid',
        }),
        EPHEMERAL_VIA_GITHUB_APP: genMockMechAdapter(),
        EPHEMERAL_VIA_AWS_SSO: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_OIDC: genMockMechAdapter(),
        REPLICA: genMockMechAdapter({
          valid: false,
          invalidReason: 'value format is invalid',
        }),
        GITHUB_APP: genMockMechAdapter(),
        AWS_SSO: genMockMechAdapter(),
      },
    };

    when('[t0] get called with invalid value', () => {
      then('status is blocked', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'XAI_API_KEY' } },
          context,
        );
        expect(result.status).toEqual('blocked');
      });

      then('message mentions firewall', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'XAI_API_KEY' } },
          context,
        );
        if (result.status === 'blocked') {
          expect(result.message).toContain('value format is invalid');
        }
      });
    });
  });

  given('[case6] key is present in process.env', () => {
    const rawKey = '__TEST_KEYRACK_ENV_VAR__';
    const envSlug = `testorg.test.${rawKey}`;
    const envValue = 'test-env-value-from-os';

    beforeEach(() => {
      process.env[rawKey] = envValue;
    });

    afterEach(() => {
      delete process.env[rawKey];
    });

    const context: KeyrackGrantContext = {
      repoManifest: genMockKeyrackRepoManifest({
        keys: { [envSlug]: { mech: 'REPLICA' } },
      }),
      // no host manifest entry for this key
      hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
      vaultAdapters: {
        'os.envvar': vaultAdapterOsEnvvar, // real adapter reads from process.env
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
      mechAdapters: {
        PERMANENT_VIA_REPLICA: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_APP: genMockMechAdapter(),
        EPHEMERAL_VIA_AWS_SSO: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_OIDC: genMockMechAdapter(),
        REPLICA: genMockMechAdapter(),
        GITHUB_APP: genMockMechAdapter(),
        AWS_SSO: genMockMechAdapter(),
      },
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

  given('[case7] key is present in both env and host manifest', () => {
    const rawKey = '__TEST_KEYRACK_ENV_VAR_PRIORITY__';
    const envSlug = `testorg.test.${rawKey}`;
    const envValue = 'value-from-env';
    const hostValue = 'value-from-host';

    beforeEach(() => {
      process.env[rawKey] = envValue;
    });

    afterEach(() => {
      delete process.env[rawKey];
    });

    const context: KeyrackGrantContext = {
      repoManifest: genMockKeyrackRepoManifest({
        keys: { [envSlug]: { mech: 'REPLICA' } },
      }),
      hostManifest: genMockKeyrackHostManifest({
        hosts: { [envSlug]: { mech: 'REPLICA', vault: 'os.direct' } },
      }),
      vaultAdapters: {
        'os.envvar': vaultAdapterOsEnvvar, // real adapter reads from process.env
        'os.direct': genMockVaultAdapter({
          isUnlocked: true,
          storage: { [envSlug]: hostValue },
        }),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
      mechAdapters: {
        PERMANENT_VIA_REPLICA: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_APP: genMockMechAdapter(),
        EPHEMERAL_VIA_AWS_SSO: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_OIDC: genMockMechAdapter(),
        REPLICA: genMockMechAdapter(),
        GITHUB_APP: genMockMechAdapter(),
        AWS_SSO: genMockMechAdapter(),
      },
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

  given('[case8] key in env fails mechanism validation', () => {
    const rawKey = '__TEST_KEYRACK_ENV_VAR_BLOCKED__';
    const envSlug = `testorg.test.${rawKey}`;
    const envValue = 'invalid-value-that-fails-firewall';

    beforeEach(() => {
      process.env[rawKey] = envValue;
    });

    afterEach(() => {
      delete process.env[rawKey];
    });

    const context: KeyrackGrantContext = {
      repoManifest: genMockKeyrackRepoManifest({
        keys: { [envSlug]: { mech: 'REPLICA' } },
      }),
      hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
      vaultAdapters: {
        'os.envvar': vaultAdapterOsEnvvar, // real adapter reads from process.env
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
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

      then('does not fall through to host manifest', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: envSlug } },
          context,
        );
        if (result.status === 'blocked') {
          // message should mention env/firewall, not host
          expect(result.message).toContain('long-lived credential blocked');
        }
      });
    });
  });

  given('[case9] key stored in aws.iam.sso vault with valid session', () => {
    const context: KeyrackGrantContext = {
      repoManifest: genMockKeyrackRepoManifest({
        keys: { 'acme.prod.AWS_PROFILE': { mech: 'EPHEMERAL_VIA_AWS_SSO' } },
      }),
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          'acme.prod.AWS_PROFILE': {
            mech: 'EPHEMERAL_VIA_AWS_SSO',
            vault: 'aws.iam.sso',
          },
        },
      }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter({
          isUnlocked: true,
          storage: { 'acme.prod.AWS_PROFILE': 'acme-prod' },
        }),
      },
      mechAdapters: {
        PERMANENT_VIA_REPLICA: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_APP: genMockMechAdapter(),
        EPHEMERAL_VIA_AWS_SSO: genMockMechAdapter({ valid: true }),
        EPHEMERAL_VIA_GITHUB_OIDC: genMockMechAdapter(),
        REPLICA: genMockMechAdapter(),
        GITHUB_APP: genMockMechAdapter(),
        AWS_SSO: genMockMechAdapter({ valid: true }),
      },
    };

    when('[t0] get called for aws sso key', () => {
      then('status is granted', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'acme.prod.AWS_PROFILE' } },
          context,
        );
        expect(result.status).toEqual('granted');
      });

      then('grant source vault is aws.iam.sso', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'acme.prod.AWS_PROFILE' } },
          context,
        );
        if (result.status === 'granted') {
          expect(result.grant.source.vault).toEqual('aws.iam.sso');
        }
      });

      then('grant value is the profile name', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'acme.prod.AWS_PROFILE' } },
          context,
        );
        if (result.status === 'granted') {
          expect(result.grant.key.secret).toEqual('acme-prod');
        }
      });
    });
  });

  given('[case10] aws.iam.sso vault locked (sso session expired)', () => {
    const context: KeyrackGrantContext = {
      repoManifest: genMockKeyrackRepoManifest({
        keys: { 'acme.prod.AWS_PROFILE': { mech: 'EPHEMERAL_VIA_AWS_SSO' } },
      }),
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          'acme.prod.AWS_PROFILE': {
            mech: 'EPHEMERAL_VIA_AWS_SSO',
            vault: 'aws.iam.sso',
          },
        },
      }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter({ isUnlocked: false }),
      },
      mechAdapters: {
        PERMANENT_VIA_REPLICA: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_APP: genMockMechAdapter(),
        EPHEMERAL_VIA_AWS_SSO: genMockMechAdapter(),
        EPHEMERAL_VIA_GITHUB_OIDC: genMockMechAdapter(),
        REPLICA: genMockMechAdapter(),
        GITHUB_APP: genMockMechAdapter(),
        AWS_SSO: genMockMechAdapter(),
      },
    };

    when('[t0] get called with expired sso session', () => {
      then('status is locked', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'acme.prod.AWS_PROFILE' } },
          context,
        );
        expect(result.status).toEqual('locked');
      });

      then('fix mentions unlock', async () => {
        const result = await getKeyrackKeyGrant(
          { for: { key: 'acme.prod.AWS_PROFILE' } },
          context,
        );
        if (result.status === 'locked') {
          expect(result.fix).toContain('unlock');
        }
      });
    });
  });
});
