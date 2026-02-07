import { UnexpectedCodePathError } from 'helpful-errors';

import type { KeyrackHostVault } from '../../../domain.objects/keyrack';
import type { KeyrackHostContext } from '../genKeyrackHostContext';

/**
 * .what = unlock vaults for repo or specific key
 * .why = prepares vaults for credential access
 */
export async function unlockKeyrackVault(
  input: { for: { repo: true }; passphrase?: string },
  context: KeyrackHostContext,
): Promise<{ unlocked: KeyrackHostVault[] }>;
export async function unlockKeyrackVault(
  input: { for: { key: string }; passphrase?: string },
  context: KeyrackHostContext,
): Promise<{ unlocked: KeyrackHostVault[] }>;
export async function unlockKeyrackVault(
  input: { for: { repo: true } | { key: string }; passphrase?: string },
  context: KeyrackHostContext,
): Promise<{ unlocked: KeyrackHostVault[] }> {
  const vaultsToUnlock = new Set<KeyrackHostVault>();

  // determine which vaults need unlock
  if ('key' in input.for) {
    // single key — find its vault
    const keyHost = context.hostManifest.hosts[input.for.key];
    if (!keyHost) {
      throw new UnexpectedCodePathError('key not configured on this host', {
        key: input.for.key,
      });
    }
    vaultsToUnlock.add(keyHost.vault);
  } else {
    // repo — collect all vaults from all configured keys
    for (const keyHost of Object.values(context.hostManifest.hosts)) {
      vaultsToUnlock.add(keyHost.vault);
    }
  }

  // unlock each vault
  const unlocked: KeyrackHostVault[] = [];
  for (const vault of vaultsToUnlock) {
    const adapter = context.vaultAdapters[vault];
    if (!adapter) {
      throw new UnexpectedCodePathError('vault adapter not found', { vault });
    }

    // check if already unlocked
    const isUnlocked = await adapter.isUnlocked();
    if (!isUnlocked) {
      // unlock vault (pass passphrase if provided)
      await adapter.unlock({ passphrase: input.passphrase });
    }

    unlocked.push(vault);
  }

  return { unlocked };
}
