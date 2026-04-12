import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { isOpCliInstalled } from './isOpCliInstalled';
import { vaultAdapter1Password } from './vaultAdapter1Password';

/**
 * .note = no mocks used — tests real op cli behavior (conditional on op availability)
 * .note = tests fail-fast with ConstraintError when op cli not installed (expected)
 * .note = no snapshot coverage because 1password adapter is internal vault contract, not user-faced
 */

describe('vaultAdapter1Password', () => {
  let opAvailable: boolean;

  beforeAll(async () => {
    opAvailable = await isOpCliInstalled();
    if (!opAvailable) {
      console.log('skipped 1password integration tests: op cli not available');
    }
  });

  given('[case1] op cli is not installed', () => {
    when('[t0] isUnlocked called', () => {
      then('returns false when op is unavailable', async () => {
        if (opAvailable) {
          throw new ConstraintError(
            'cannot test "op cli not installed" case when op is installed',
            { hint: 'this test verifies behavior when op cli is absent' },
          );
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

  given('[case3] del is a noop (1password is refed vault)', () => {
    when('[t0] del called', () => {
      then(
        'completes without error (keyrack only removes manifest entry)',
        async () => {
          // 1password is a refed vault — keyrack stores pointer, not secret
          // del removes the pointer (manifest entry), not the 1password item
          // the adapter del is noop; delKeyrackKeyHost handles manifest removal
          await expect(
            vaultAdapter1Password.del({ slug: 'TEST_KEY' }),
          ).resolves.toBeUndefined();
        },
      );
    });
  });

  given('[case4] op cli is available (conditional)', () => {
    when('[t0] unlock called', () => {
      then('does not throw (noop)', async () => {
        // unlock is a noop for 1password - it relies on biometric or env var
        await expect(
          vaultAdapter1Password.unlock({ identity: null }),
        ).resolves.toBeUndefined();
      });
    });

    when('[t1] isUnlocked called with op available', () => {
      then('returns boolean based on auth state', async () => {
        if (!opAvailable) {
          throw new ConstraintError('op cli not installed', {
            hint: 'install 1password cli: brew install 1password-cli',
          });
        }

        const result = await vaultAdapter1Password.isUnlocked();
        expect(typeof result).toBe('boolean');
      });
    });

    when('[t2] get called with invalid exid', () => {
      then('returns null for absent item', async () => {
        if (!opAvailable) {
          throw new ConstraintError('op cli not installed', {
            hint: 'install 1password cli: brew install 1password-cli',
          });
        }

        // fail loud if not authenticated - op must be signed in to test item lookup
        const isUnlocked = await vaultAdapter1Password.isUnlocked();
        if (!isUnlocked) {
          throw new ConstraintError('op cli not authenticated', {
            hint: 'run: op signin',
          });
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

  given('[case5] set validates exid format', () => {
    when('[t0] set called with invalid exid format', () => {
      then('throws BadRequestError about invalid format', async () => {
        if (!opAvailable) {
          throw new ConstraintError('op cli not installed', {
            hint: 'install 1password cli: brew install 1password-cli',
          });
        }

        const error = await getError(
          vaultAdapter1Password.set({
            slug: 'TEST_KEY',
            exid: 'not-a-valid-exid',
          }),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('secret reference uri');
      });
    });
  });
});
