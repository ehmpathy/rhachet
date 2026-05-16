import { getError, given, then, when } from 'test-fns';

import { vaultAdapterOsEnvvar } from './vaultAdapterOsEnvvar';

/**
 * .note = no mocks used — tests pure env var access
 * .note = no snapshot coverage because os.envvar is internal vault adapter, not user-faced contract
 */

describe('vaultAdapterOsEnvvar', () => {
  given('[case1] vault unlock state', () => {
    when('[t0] isUnlocked called', () => {
      then('returns true', async () => {
        const result = await vaultAdapterOsEnvvar.isUnlocked();
        expect(result).toBe(true);
      });
    });

    when('[t1] unlock called', () => {
      then('completes without error (no-op)', async () => {
        await expect(
          vaultAdapterOsEnvvar.unlock({ identity: null }),
        ).resolves.toBeUndefined();
      });
    });
  });

  given('[case2] env var is present', () => {
    const testRawKey = '__TEST_VAULT_OS_ENVVAR_KEY__';
    const testSlug = `testorg.test.${testRawKey}`;
    const testValue = 'test-value-12345';

    beforeEach(() => {
      process.env[testRawKey] = testValue;
    });

    afterEach(() => {
      delete process.env[testRawKey];
    });

    when('[t0] get called with slug', () => {
      then('returns KeyrackKeyGrant with env value as secret', async () => {
        const result = await vaultAdapterOsEnvvar.get({ slug: testSlug });
        expect(result).not.toBeNull();
        expect(result!.slug).toEqual(testSlug);
        expect(result!.key.secret).toEqual(testValue);
        expect(result!.source.vault).toEqual('os.envvar');
        expect(result!.source.mech).toEqual('PERMANENT_VIA_REPLICA');
      });
    });
  });

  given('[case3] env var is absent', () => {
    when('[t0] get called with nonexistent slug', () => {
      then('returns null', async () => {
        const result = await vaultAdapterOsEnvvar.get({
          slug: '__NONEXISTENT_KEY_THAT_SHOULD_NOT_EXIST__',
        });
        expect(result).toBeNull();
      });
    });
  });

  /**
   * [case4] github app credentials without mech field (pre-fix scenario)
   * .what = verifies fallback to PERMANENT_VIA_REPLICA when mech absent
   * .why = documents the buggy behavior before fix - raw JSON passed through
   * .ref = wish 0.wish.md - keyrack set didn't embed mech field
   *
   * .note = full roundtrip with EPHEMERAL_VIA_GITHUB_APP is tested in integration tests
   *         because deliverForGet requires real GitHub API credentials
   */
  given(
    '[case4] env var contains github app credentials WITHOUT mech field',
    () => {
      const testRawKey = '__TEST_GITHUB_APP_NO_MECH__';
      const testSlug = `testorg.test.${testRawKey}`;
      const testJson = JSON.stringify({
        appId: '3234162',
        installationId: '123456',
        privateKey:
          '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
        // no mech field - this was the bug
      });

      beforeEach(() => {
        process.env[testRawKey] = testJson;
      });

      afterEach(() => {
        delete process.env[testRawKey];
      });

      when('[t0] get called with slug', () => {
        then('falls back to PERMANENT_VIA_REPLICA', async () => {
          const result = await vaultAdapterOsEnvvar.get({ slug: testSlug });
          expect(result).not.toBeNull();
          // this is the bug scenario - without mech, it defaults to passthrough
          expect(result!.source.mech).toEqual('PERMANENT_VIA_REPLICA');
        });

        then('raw JSON is returned as secret (buggy behavior)', async () => {
          const result = await vaultAdapterOsEnvvar.get({ slug: testSlug });
          // the "secret" is the raw JSON because PERMANENT_VIA_REPLICA passes through
          expect(result!.key.secret).toContain('appId');
          expect(result!.key.secret).toContain('3234162');
        });
      });
    },
  );

  /**
   * [case5] mech detection via inferKeyrackMechForGet
   * .what = verifies mech detection works correctly with embedded mech field
   * .why = ensures the fix (mech embedded in JSON) enables correct detection
   * .note = actual deliverForGet call requires integration test (GitHub API)
   */
  given('[case5] JSON with embedded mech field is detected correctly', () => {
    when(
      '[t0] inferKeyrackMechForGet called with JSON that has mech field',
      () => {
        const testJson = JSON.stringify({
          appId: '3234162',
          installationId: '123456',
          privateKey:
            '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
          mech: 'EPHEMERAL_VIA_GITHUB_APP',
        });

        then('returns EPHEMERAL_VIA_GITHUB_APP', () => {
          // import is at top of file in real usage
          const {
            inferKeyrackMechForGet,
          } = require('../../../inferKeyrackMechForGet');
          const mech = inferKeyrackMechForGet({ value: testJson });
          expect(mech).toEqual('EPHEMERAL_VIA_GITHUB_APP');
        });
      },
    );

    when(
      '[t1] inferKeyrackMechForGet called with JSON that lacks mech field',
      () => {
        const testJson = JSON.stringify({
          appId: '3234162',
          installationId: '123456',
          privateKey:
            '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
          // no mech field
        });

        then('falls back to PERMANENT_VIA_REPLICA', () => {
          const {
            inferKeyrackMechForGet,
          } = require('../../../inferKeyrackMechForGet');
          const mech = inferKeyrackMechForGet({ value: testJson });
          expect(mech).toEqual('PERMANENT_VIA_REPLICA');
        });
      },
    );
  });

  given('[case6] write operation attempted (os.envvar is read-only)', () => {
    when('[t0] set called', () => {
      then('throws UnexpectedCodePathError', async () => {
        const error = await getError(
          vaultAdapterOsEnvvar.set({
            slug: 'ANY_KEY',
          }),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('os.envvar is read-only');
      });
    });

    when('[t1] del called', () => {
      then('throws UnexpectedCodePathError', async () => {
        const error = await getError(
          vaultAdapterOsEnvvar.del({ slug: 'ANY_KEY' }),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('os.envvar is read-only');
      });
    });
  });
});
