import { getError, given, then, when } from 'test-fns';

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { vaultAdapter1Password } from './vaultAdapter1Password';

const execAsync = promisify(exec);

/**
 * .what = check if 1password cli is available
 * .why = tests should skip gracefully if op is not installed
 */
const isOpCliAvailable = async (): Promise<boolean> => {
  try {
    await execAsync('which op');
    return true;
  } catch {
    return false;
  }
};

describe('vaultAdapter1Password', () => {
  let opAvailable: boolean;

  beforeAll(async () => {
    opAvailable = await isOpCliAvailable();
    if (!opAvailable) {
      console.log('skipped 1password integration tests: op cli not available');
    }
  });

  given('[case1] op cli is not installed', () => {
    when('[t0] isUnlocked called', () => {
      then('returns false when op is unavailable', async () => {
        if (opAvailable) {
          // skip if op is available - we can't test this case
          expect(true).toBe(true);
          return;
        }

        const result = await vaultAdapter1Password.isUnlocked();
        expect(result).toBe(false);
      });
    });
  });

  given('[case2] get requires exid', () => {
    when('[t0] get called without exid', () => {
      then('throws error about absent exid', async () => {
        const error = await getError(
          vaultAdapter1Password.get({ slug: 'TEST_KEY' }),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('requires exid');
      });
    });
  });

  given('[case3] set is not supported', () => {
    when('[t0] set called', () => {
      then('throws error about unsupported operation', async () => {
        const error = await getError(
          vaultAdapter1Password.set({
            slug: 'TEST_KEY',
            secret: 'test-value',
            env: 'test',
            org: 'testorg',
          }),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('does not support set');
      });
    });
  });

  given('[case4] del is not supported', () => {
    when('[t0] del called', () => {
      then('throws error about unsupported operation', async () => {
        const error = await getError(
          vaultAdapter1Password.del({ slug: 'TEST_KEY' }),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('does not support del');
      });
    });
  });

  given('[case5] op cli is available (conditional)', () => {
    when('[t0] unlock called', () => {
      then('does not throw (noop)', async () => {
        // unlock is a noop for 1password - it relies on biometric or env var
        await vaultAdapter1Password.unlock({});
        expect(true).toBe(true);
      });
    });

    when('[t1] isUnlocked called with op available', () => {
      then('returns boolean based on auth state', async () => {
        if (!opAvailable) {
          expect(true).toBe(true);
          return;
        }

        const result = await vaultAdapter1Password.isUnlocked();
        expect(typeof result).toBe('boolean');
      });
    });

    when('[t2] get called with invalid exid', () => {
      then('returns null for absent item', async () => {
        if (!opAvailable) {
          expect(true).toBe(true);
          return;
        }

        // skip if not authenticated - op must be signed in to test item lookup
        const isUnlocked = await vaultAdapter1Password.isUnlocked();
        if (!isUnlocked) {
          console.log('skipped 1password get test: op cli not authenticated');
          expect(true).toBe(true);
          return;
        }

        // test with an obviously fake exid
        const result = await vaultAdapter1Password.get({
          slug: 'FAKE_KEY',
          exid: 'op://nonexistent-vault/nonexistent-item/password',
        });
        expect(result).toBeNull();
      });
    });
  });
});
