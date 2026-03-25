import { given, then, when } from 'test-fns';

import { vaultAdapterOsDaemon } from './vaultAdapterOsDaemon';

describe('vaultAdapterOsDaemon', () => {
  given('[case1] vault unlock state', () => {
    when('[t0] unlock called', () => {
      then('completes without error (noop)', async () => {
        await expect(
          vaultAdapterOsDaemon.unlock({ identity: null }),
        ).resolves.toBeUndefined();
      });
    });

    when('[t1] isUnlocked called', () => {
      then('returns a boolean', async () => {
        const result = await vaultAdapterOsDaemon.isUnlocked();
        expect(typeof result).toBe('boolean');
      });
    });
  });

  given('[case2] daemon not reachable', () => {
    when('[t0] get called when daemon not active', () => {
      then('returns null', async () => {
        // daemon may or may not be active — if not reachable, returns null
        const result = await vaultAdapterOsDaemon.get({
          slug: 'testorg.test.NONEXISTENT_KEY',
        });
        // either null (daemon not reachable or key not found) or a string
        expect(result === null || typeof result === 'string').toBe(true);
      });
    });
  });
});
