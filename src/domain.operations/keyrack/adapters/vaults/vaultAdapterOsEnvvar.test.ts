import { getError, given, then, when } from 'test-fns';

import { vaultAdapterOsEnvvar } from './vaultAdapterOsEnvvar';

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
        await expect(vaultAdapterOsEnvvar.unlock({})).resolves.toBeUndefined();
      });
    });
  });

  given('[case2] env var is present', () => {
    const testKey = '__TEST_VAULT_OS_ENVVAR_KEY__';
    const testValue = 'test-value-12345';

    beforeEach(() => {
      process.env[testKey] = testValue;
    });

    afterEach(() => {
      delete process.env[testKey];
    });

    when('[t0] get called with slug', () => {
      then('returns env value', async () => {
        const result = await vaultAdapterOsEnvvar.get({ slug: testKey });
        expect(result).toEqual(testValue);
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

  given('[case4] write operation attempted', () => {
    when('[t0] set called', () => {
      then('throws UnexpectedCodePathError', async () => {
        const error = await getError(
          vaultAdapterOsEnvvar.set({
            slug: 'ANY_KEY',
            value: 'any-value',
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
