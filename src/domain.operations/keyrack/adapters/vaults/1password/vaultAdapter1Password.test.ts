import { getError, given, then, when } from 'test-fns';

import {
  asAccountErrorMessage,
  asVaultErrorMessage,
  asVaultNameFromExid,
  isKeyrackAccount,
  REQUIRED_ACCOUNT_NAME,
  REQUIRED_VAULT_NAME,
  vaultAdapter1Password,
} from './vaultAdapter1Password';

/**
 * .note = no mocks used here — tests pure logic of exid parse and validation
 * .note = no snapshot coverage because 1password adapter is internal vault contract, not user-faced
 */

describe('vaultAdapter1Password', () => {
  given('[case1] vault unlock behavior', () => {
    when('[t0] unlock called', () => {
      then('completes without error (noop)', async () => {
        // 1password unlock is noop — relies on biometric or service account token
        await expect(
          vaultAdapter1Password.unlock({ identity: null }),
        ).resolves.toBeUndefined();
      });
    });
  });

  given('[case2] get requires exid', () => {
    when('[t0] get called without exid', () => {
      then('throws UnexpectedCodePathError', async () => {
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

  given('[case4] vault scope enforcement via asVaultNameFromExid', () => {
    when('[t0] exid references keyrack vault', () => {
      then('extracts vault name correctly', () => {
        const vault = asVaultNameFromExid({
          exid: `op://${REQUIRED_VAULT_NAME}/stripe-key/credential`,
        });
        expect(vault).toEqual(REQUIRED_VAULT_NAME);
      });
    });

    when('[t1] exid references non-keyrack vault', () => {
      then('extracts vault name (enforcement happens elsewhere)', () => {
        const vault = asVaultNameFromExid({
          exid: 'op://Personal/stripe-key/credential',
        });
        expect(vault).toEqual('Personal');
      });
    });

    when('[t2] exid has invalid format', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(
          Promise.resolve().then(() =>
            asVaultNameFromExid({ exid: 'invalid-exid' }),
          ),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('invalid 1password exid format');
      });
    });

    when('[t3] exid is missing vault segment', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(
          Promise.resolve().then(() => asVaultNameFromExid({ exid: 'op://' })),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('invalid 1password exid format');
      });
    });
  });

  given('[case5] account scope enforcement via isKeyrackAccount', () => {
    when('[t0] account url includes keyrack', () => {
      then('returns true', () => {
        const result = isKeyrackAccount({
          url: `https://${REQUIRED_ACCOUNT_NAME}.1password.com`,
          email: 'user@example.com',
        });
        expect(result).toBe(true);
      });
    });

    when('[t1] account email includes keyrack', () => {
      then('returns true', () => {
        const result = isKeyrackAccount({
          url: 'https://personal.1password.com',
          email: `${REQUIRED_ACCOUNT_NAME}@example.com`,
        });
        expect(result).toBe(true);
      });
    });

    when('[t2] account url includes keyrack (case insensitive)', () => {
      then('returns true', () => {
        const result = isKeyrackAccount({
          url: 'https://KEYRACK.1password.com',
          email: 'user@example.com',
        });
        expect(result).toBe(true);
      });
    });

    when('[t3] neither url nor email includes keyrack', () => {
      then('returns false', () => {
        const result = isKeyrackAccount({
          url: 'https://personal.1password.com',
          email: 'vlad@example.com',
        });
        expect(result).toBe(false);
      });
    });
  });

  given('[case6] required constants are correct', () => {
    when('[t0] checking required vault name', () => {
      then('is keyrack', () => {
        expect(REQUIRED_VAULT_NAME).toEqual('keyrack');
      });
    });

    when('[t1] checking required account name', () => {
      then('is keyrack', () => {
        expect(REQUIRED_ACCOUNT_NAME).toEqual('keyrack');
      });
    });
  });

  given('[case7] vault error message output', () => {
    when('[t0] exid references non-keyrack vault', () => {
      then('error message matches snapshot', () => {
        const message = asVaultErrorMessage({
          exid: 'op://Personal/stripe-key/credential',
        });
        expect(message.join('\n')).toMatchSnapshot();
      });
    });

    when('[t1] error message includes the provided exid', () => {
      then('shows user what they provided', () => {
        const message = asVaultErrorMessage({
          exid: 'op://Work/api-token/password',
        });
        expect(message.join('\n')).toContain(
          'provided: op://Work/api-token/password',
        );
      });
    });

    when('[t2] error message includes fix instructions', () => {
      then('shows how to fix', () => {
        const message = asVaultErrorMessage({
          exid: 'op://Personal/test/field',
        });
        const text = message.join('\n');
        expect(text).toContain('to fix:');
        expect(text).toContain("create a vault named 'keyrack'");
        expect(text).toContain('op://keyrack/item/field');
      });
    });
  });

  given('[case8] account error message output', () => {
    when('[t0] account is not keyrack', () => {
      then('error message matches snapshot', () => {
        const message = asAccountErrorMessage({
          email: 'vlad@example.com',
          url: 'https://personal.1password.com',
        });
        expect(message.join('\n')).toMatchSnapshot();
      });
    });

    when('[t1] error message includes the authenticated account', () => {
      then('shows user what they are authenticated as', () => {
        const message = asAccountErrorMessage({
          email: 'user@company.com',
          url: 'https://company.1password.com',
        });
        expect(message.join('\n')).toContain(
          'provided: user@company.com (https://company.1password.com)',
        );
      });
    });

    when('[t2] error message includes fix instructions', () => {
      then('shows how to fix', () => {
        const message = asAccountErrorMessage({
          email: 'vlad@example.com',
          url: 'https://personal.1password.com',
        });
        const text = message.join('\n');
        expect(text).toContain('to fix:');
        expect(text).toContain("create a 1password account with 'keyrack'");
        expect(text).toContain('op signin --account keyrack');
      });
    });
  });
});
