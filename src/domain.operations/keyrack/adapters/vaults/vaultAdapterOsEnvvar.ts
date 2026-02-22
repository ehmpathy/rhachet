import { UnexpectedCodePathError } from 'helpful-errors';

import type { KeyrackHostVaultAdapter } from '@src/domain.objects/keyrack';
import { asKeyrackKeyName } from '@src/domain.operations/keyrack/asKeyrackKeyName';

/**
 * .what = vault adapter that reads from process.env
 * .why = passthrough for env vars (ci secrets, local exports)
 *
 * .note = read-only vault — set and del throw UnexpectedCodePathError
 * .note = always unlocked — no authentication required
 * .note = always checked first in grant flow (see getKeyrackKeyGrant)
 */
export const vaultAdapterOsEnvvar: KeyrackHostVaultAdapter = {
  /**
   * .what = os.envvar vault is always unlocked
   * .why = env vars are already in memory, no auth needed
   */
  isUnlocked: async () => true,

  /**
   * .what = no-op unlock for os.envvar
   * .why = vault is always unlocked, unlock is a no-op
   */
  unlock: async () => {},

  /**
   * .what = read value from process.env via raw key name
   * .why = core operation for passthrough grant flow
   *
   * .note = exid is ignored for os.envvar
   * .note = extracts raw key name from slug (e.g., testorg.test.AWS_PROFILE -> AWS_PROFILE)
   */
  get: async (input: { slug: string }) => {
    const keyName = asKeyrackKeyName({ slug: input.slug });
    return process.env[keyName] ?? null;
  },

  /**
   * .what = set is forbidden for os.envvar
   * .why = read-only vault; env vars are set by caller (ci workflow, shell export)
   */
  set: async () => {
    throw new UnexpectedCodePathError(
      'os.envvar is read-only; env vars are set by the caller, not via keyrack',
    );
  },

  /**
   * .what = del is forbidden for os.envvar
   * .why = read-only vault; env vars are managed by the caller
   */
  del: async () => {
    throw new UnexpectedCodePathError(
      'os.envvar is read-only; env vars are managed by the caller, not via keyrack',
    );
  },
};
