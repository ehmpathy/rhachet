import { UnexpectedCodePathError } from 'helpful-errors';

import type { KeyrackHostVaultAdapter } from '@src/domain.objects/keyrack';

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * .what = execute an `op` cli command
 * .why = wraps subprocess execution with error handler
 */
const execOp = async (
  args: string[],
): Promise<{ stdout: string; stderr: string }> => {
  const command = ['op', ...args].join(' ');
  return execAsync(command);
};

/**
 * .what = vault adapter for 1password storage
 * .why = stores credentials in 1password via the `op` cli
 *
 * .note = requires 1password cli to be installed and authenticated
 */
export const vaultAdapter1Password: KeyrackHostVaultAdapter = {
  /**
   * .what = unlock the vault for the current session
   * .why = 1password cli handles auth via biometric or service account token
   *
   * .note = for biometric: 1password app integration handles unlock
   * .note = for ci: set OP_SERVICE_ACCOUNT_TOKEN env var
   */
  unlock: async () => {
    // noop — 1password cli handles auth via biometric or service account token
    // the `op` commands will prompt for auth if needed
  },

  /**
   * .what = check if the vault is unlocked
   * .why = uses `op whoami` to detect if 1password is authenticated
   */
  isUnlocked: async () => {
    try {
      await execOp(['whoami']);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * .what = retrieve a credential from 1password
   * .why = uses `op read` with a secret reference uri
   */
  get: async (input) => {
    // exid is the 1password secret reference uri
    // e.g., "op://vault/item/field"
    if (!input.exid)
      throw new UnexpectedCodePathError(
        '1password vault requires exid (secret reference uri)',
        { input },
      );

    try {
      const { stdout } = await execOp(['read', input.exid]);
      return stdout.trim();
    } catch (error) {
      // op read returns error if item not found
      if (
        error instanceof Error &&
        error.message.includes('could not be found')
      ) {
        return null;
      }
      throw error;
    }
  },

  /**
   * .what = store a credential in 1password
   * .why = 1password write operations require explicit item creation
   *
   * .note = for keyrack, we expect items to be pre-created in 1password
   * .note = this operation is not supported — use 1password app/cli directly
   */
  set: async (input) => {
    throw new UnexpectedCodePathError(
      '1password vault does not support set via keyrack; use 1password app or cli directly',
      { input },
    );
  },

  /**
   * .what = remove a credential from 1password
   * .why = 1password delete operations require explicit item removal
   *
   * .note = for keyrack, we do not support delete
   * .note = use 1password app/cli directly to manage items
   */
  del: async (input) => {
    throw new UnexpectedCodePathError(
      '1password vault does not support del via keyrack; use 1password app or cli directly',
      { input },
    );
  },
};
