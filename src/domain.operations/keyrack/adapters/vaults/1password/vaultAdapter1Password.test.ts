import { getError, given, then, when } from 'test-fns';

import { vaultAdapter1Password } from './vaultAdapter1Password';

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
});
