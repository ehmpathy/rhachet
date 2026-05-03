import type { KeyrackHostVault } from '@src/domain.objects/keyrack/KeyrackHostVault';

/**
 * .what = determines if a vault is ephemeral (cleared on relock)
 * .why = ephemeral vaults skip inventory since they don't persist across sessions
 *
 * ephemeral vaults:
 * - os.daemon: in-memory session cache, cleared on relock
 *
 * .note = inventory tracks "was set via keyrack" for locked vs absent status
 * .note = ephemeral vaults are session-only, so inventory is not meaningful
 */
export const isEphemeralVault = (input: { vault: KeyrackHostVault }): boolean =>
  input.vault === 'os.daemon';
