/**
 * .what = lightweight keyrack-focused entry point for rhachet
 * .why = enables consumers to import keyrack functionality
 *        for credential management without the full SDK
 *
 * usage:
 *   import { keyrack, KeyrackKeyGrant } from 'rhachet/keyrack';
 *
 *   const grants = await keyrack.get({ for: { repo: true } });
 *   const grant = await keyrack.get({ for: { key: 'XAI_API_KEY' } });
 *   await keyrack.set({ slug: 'XAI_API_KEY', mech: 'REPLICA', vault: 'os.direct' });
 *   await keyrack.unlock({ for: { repo: true } });
 */

import { getGitRepoRoot } from 'rhachet-artifact-git';

import type { KeyrackGrantMechanism } from '@src/domain.objects/keyrack/KeyrackGrantMechanism';
import type { KeyrackHostVault } from '@src/domain.objects/keyrack/KeyrackHostVault';
import { genKeyrackGrantContext } from '@src/domain.operations/keyrack/genKeyrackGrantContext';
import { genKeyrackHostContext } from '@src/domain.operations/keyrack/genKeyrackHostContext';
import { getKeyrackKeyGrant } from '@src/domain.operations/keyrack/getKeyrackKeyGrant';
import { setKeyrackKeyHost } from '@src/domain.operations/keyrack/setKeyrackKeyHost';
import { unlockKeyrackVault } from '@src/domain.operations/keyrack/vault/unlockKeyrackVault';

// domain objects
export type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';
// literals (types)
export type { KeyrackGrantMechanism } from '@src/domain.objects/keyrack/KeyrackGrantMechanism';
// adapters (types)
export type { KeyrackGrantMechanismAdapter } from '@src/domain.objects/keyrack/KeyrackGrantMechanismAdapter';
export type { KeyrackGrantStatus } from '@src/domain.objects/keyrack/KeyrackGrantStatus';
export { KeyrackHostManifest } from '@src/domain.objects/keyrack/KeyrackHostManifest';
export type { KeyrackHostVault } from '@src/domain.objects/keyrack/KeyrackHostVault';
export type { KeyrackHostVaultAdapter } from '@src/domain.objects/keyrack/KeyrackHostVaultAdapter';
export { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
export { KeyrackKeyHost } from '@src/domain.objects/keyrack/KeyrackKeyHost';
export { KeyrackKeySpec } from '@src/domain.objects/keyrack/KeyrackKeySpec';
export { KeyrackRepoManifest } from '@src/domain.objects/keyrack/KeyrackRepoManifest';
// context types
export type { KeyrackGrantContext } from '@src/domain.operations/keyrack/genKeyrackGrantContext';
// low-level operations (for advanced usage)
export { genKeyrackGrantContext } from '@src/domain.operations/keyrack/genKeyrackGrantContext';
export type { KeyrackHostContext } from '@src/domain.operations/keyrack/genKeyrackHostContext';
export { genKeyrackHostContext } from '@src/domain.operations/keyrack/genKeyrackHostContext';
export { getKeyrackKeyGrant } from '@src/domain.operations/keyrack/getKeyrackKeyGrant';
export { setKeyrackKeyHost } from '@src/domain.operations/keyrack/setKeyrackKeyHost';
export { unlockKeyrackVault } from '@src/domain.operations/keyrack/vault/unlockKeyrackVault';

/**
 * .what = keyrack sdk namespace
 * .why = provides simple api for credential management
 */
export const keyrack = {
  /**
   * .what = get credentials from keyrack
   * .why = resolves keys from vault via configured mechanism
   */
  get: async (input: {
    for: { repo: true } | { key: string };
    env?: string;
  }) => {
    const gitroot = await getGitRepoRoot({ from: process.cwd() });
    const context = await genKeyrackGrantContext({ gitroot });

    if ('repo' in input.for) {
      return getKeyrackKeyGrant(
        { for: { repo: true }, env: input.env },
        context,
      );
    }
    return getKeyrackKeyGrant({ for: { key: input.for.key } }, context);
  },

  /**
   * .what = set credential storage on host
   * .why = configure how a key is stored and resolved
   */
  set: async (input: {
    slug: string;
    mech: KeyrackGrantMechanism;
    vault: KeyrackHostVault;
    exid?: string;
  }) => {
    const context = await genKeyrackHostContext();
    return setKeyrackKeyHost(
      {
        slug: input.slug,
        mech: input.mech,
        vault: input.vault,
        exid: input.exid,
      },
      context,
    );
  },

  /**
   * .what = unlock vaults for credential access
   * .why = some vaults require explicit unlock before read
   */
  unlock: async (input: {
    for: { repo: true } | { key: string };
    passphrase?: string;
  }) => {
    const context = await genKeyrackHostContext();

    if ('repo' in input.for) {
      return unlockKeyrackVault(
        { for: { repo: true }, passphrase: input.passphrase },
        context,
      );
    }
    return unlockKeyrackVault(
      { for: { key: input.for.key }, passphrase: input.passphrase },
      context,
    );
  },
};
