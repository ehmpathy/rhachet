import { getError, given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';
import { genMockVaultAdapter } from '@src/.test/assets/genMockVaultAdapter';

import type { KeyrackHostContext } from '../genKeyrackHostContext';
import { unlockKeyrackVault } from './unlockKeyrackVault';

describe('unlockKeyrackVault', () => {
  given('[case1] single key with locked vault', () => {
    const vaultAdapter = genMockVaultAdapter({ isUnlocked: false });
    const context: KeyrackHostContext = {
      hostManifest: genMockKeyrackHostManifest({
        hosts: { XAI_API_KEY: { mech: 'REPLICA', vault: 'os.direct' } },
      }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': vaultAdapter,
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
    };

    when('[t0] unlock called for key', () => {
      then('unlocks the vault', async () => {
        const result = await unlockKeyrackVault(
          { for: { key: 'XAI_API_KEY' } },
          context,
        );
        expect(result.unlocked).toContain('os.direct');
      });

      then('vault is now unlocked', async () => {
        await unlockKeyrackVault({ for: { key: 'XAI_API_KEY' } }, context);
        const isUnlocked = await vaultAdapter.isUnlocked();
        expect(isUnlocked).toBe(true);
      });
    });
  });

  given('[case2] key not configured on host', () => {
    const context: KeyrackHostContext = {
      hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
    };

    when('[t0] unlock called for unconfigured key', () => {
      then('throws error', async () => {
        const error = await getError(
          unlockKeyrackVault({ for: { key: 'UNKNOWN_KEY' } }, context),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('not configured');
      });
    });
  });

  given('[case3] repo with multiple vaults', () => {
    const osDirect = genMockVaultAdapter({ isUnlocked: false });
    const osSecure = genMockVaultAdapter({ isUnlocked: false });
    const context: KeyrackHostContext = {
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          KEY_A: { mech: 'REPLICA', vault: 'os.direct' },
          KEY_B: { mech: 'REPLICA', vault: 'os.secure' },
        },
      }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': osDirect,
        'os.secure': osSecure,
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
    };

    when('[t0] unlock called for repo', () => {
      then('unlocks all vaults', async () => {
        const result = await unlockKeyrackVault(
          { for: { repo: true } },
          context,
        );
        expect(result.unlocked).toContain('os.direct');
        expect(result.unlocked).toContain('os.secure');
      });

      then('all vaults are now unlocked', async () => {
        await unlockKeyrackVault({ for: { repo: true } }, context);
        expect(await osDirect.isUnlocked()).toBe(true);
        expect(await osSecure.isUnlocked()).toBe(true);
      });
    });
  });

  given('[case4] vault already unlocked', () => {
    const vaultAdapter = genMockVaultAdapter({ isUnlocked: true });
    const context: KeyrackHostContext = {
      hostManifest: genMockKeyrackHostManifest({
        hosts: { XAI_API_KEY: { mech: 'REPLICA', vault: 'os.direct' } },
      }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': vaultAdapter,
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.iam.sso': genMockVaultAdapter(),
      },
    };

    when('[t0] unlock called when already unlocked', () => {
      then('still returns vault in unlocked list', async () => {
        const result = await unlockKeyrackVault(
          { for: { key: 'XAI_API_KEY' } },
          context,
        );
        expect(result.unlocked).toContain('os.direct');
      });
    });
  });
});
