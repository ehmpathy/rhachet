import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import type { KeyrackHostVaultAdapter } from '@src/domain.objects/keyrack';
import { promptVisibleInput } from '@src/infra/promptVisibleInput';

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { isOpCliInstalled } from './isOpCliInstalled';

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
 * .what = the required vault name for 1password integration
 * .why = limits blast radius since 1password cannot scope biometric prompts
 *
 * .note = see rule.require.1password-vault-scope.md for rationale
 */
export const REQUIRED_VAULT_NAME = 'keyrack';

/**
 * .what = the required account name for 1password integration
 * .why = ensures dedicated keyrack account, not personal credentials
 */
export const REQUIRED_ACCOUNT_NAME = 'keyrack';

/**
 * .what = parse vault name from 1password exid
 * .why = exid format is op://vault/item/field — extract vault segment
 */
export const asVaultNameFromExid = (input: { exid: string }): string => {
  const match = input.exid.match(/^op:\/\/([^/]+)\//);
  if (!match?.[1])
    throw new BadRequestError('invalid 1password exid format', {
      exid: input.exid,
      expected: 'op://vault/item/field',
    });
  return match[1];
};

/**
 * .what = get account info from op whoami
 * .why = used to validate account name constraint
 */
const getOneOpAccount = async (): Promise<{
  url: string;
  email: string;
  user_uuid: string;
  account_uuid: string;
}> => {
  const { stdout } = await execOp(['whoami', '--format', 'json']);
  return JSON.parse(stdout);
};

/**
 * .what = check if account name contains required identifier
 * .why = account url or email should contain 'keyrack' to prove dedicated account
 */
export const isKeyrackAccount = (account: {
  url: string;
  email: string;
}): boolean => {
  const urlLower = account.url.toLowerCase();
  const emailLower = account.email.toLowerCase();
  return (
    urlLower.includes(REQUIRED_ACCOUNT_NAME) ||
    emailLower.includes(REQUIRED_ACCOUNT_NAME)
  );
};

/**
 * .what = generate error message lines for wrong vault
 * .why = testable error message generation
 */
export const asVaultErrorMessage = (input: { exid: string }): string[] => [
  '',
  '🔐 keyrack',
  `   └─ ✗ 1password vault must be named '${REQUIRED_VAULT_NAME}'`,
  '',
  `   provided: ${input.exid}`,
  `   expected: op://${REQUIRED_VAULT_NAME}/...`,
  '',
  '   why:',
  '   dev machines are supply chain attack vectors.',
  '   1password is incapable of per-item authorization.',
  '   therefore, keyrack enforces blast-radius limits: dedicated account, dedicated vault.',
  '',
  '   (if you need personal creds, use a flatpak-sandboxed browser with 1password)',
  '',
  '   to fix:',
  `   1. create a vault named '${REQUIRED_VAULT_NAME}' in your keyrack 1password account`,
  `   2. move or copy the item to the '${REQUIRED_VAULT_NAME}' vault`,
  `   3. copy the new secret reference: op://${REQUIRED_VAULT_NAME}/item/field`,
  '',
  '   if this bugs you, ask 1password for per-item auth (extract one key, dont unlock vault):',
  '   https://1password.community/discussion/134015/feature-request-account-password-prompt-for-selected-passwords-or-secure-notes',
  '',
];

/**
 * .what = failfast if exid vault is not 'keyrack'
 * .why = limits blast radius — only keyrack vault items accessible
 */
const assertVaultIsKeyrack = (input: { exid: string }): void => {
  const vault = asVaultNameFromExid({ exid: input.exid });
  if (vault !== REQUIRED_VAULT_NAME) {
    asVaultErrorMessage({ exid: input.exid }).forEach((line) =>
      console.log(line),
    );
    process.exit(2);
  }
};

/**
 * .what = generate error message lines for wrong account
 * .why = testable error message generation
 */
export const asAccountErrorMessage = (input: {
  email: string;
  url: string;
}): string[] => [
  '',
  '🔐 keyrack',
  `   └─ ✗ 1password account name must include '${REQUIRED_ACCOUNT_NAME}'`,
  '',
  `   provided: ${input.email} (${input.url})`,
  `   expected: '${REQUIRED_ACCOUNT_NAME}' in email or account url`,
  '',
  '   why:',
  '   dev machines are supply chain attack vectors.',
  '   1password is incapable of per-item authorization.',
  '   therefore, keyrack enforces blast-radius limits: dedicated account, dedicated vault.',
  '',
  '   (if you need personal creds, use a flatpak-sandboxed browser with 1password)',
  '',
  '   to fix:',
  `   1. create a 1password account with '${REQUIRED_ACCOUNT_NAME}' in its name`,
  `   2. sign into that account: op account add --address ${REQUIRED_ACCOUNT_NAME}.1password.com`,
  `   3. switch to that account: op signin --account ${REQUIRED_ACCOUNT_NAME}`,
  '',
  '   if this bugs you, ask 1password for per-item auth (extract one key, dont unlock vault):',
  '   https://1password.community/discussion/134015/feature-request-account-password-prompt-for-selected-passwords-or-secure-notes',
  '',
];

/**
 * .what = failfast if account is not a keyrack account
 * .why = ensures dedicated account, not personal credentials exposed
 */
const assertAccountIsKeyrack = async (): Promise<void> => {
  const account = await getOneOpAccount();
  if (!isKeyrackAccount(account)) {
    asAccountErrorMessage({ email: account.email, url: account.url }).forEach(
      (line) => console.log(line),
    );
    process.exit(2);
  }
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

    // failfast: account must be 'keyrack' (check first — if wrong account, vault check is pointless)
    await assertAccountIsKeyrack();

    // failfast: vault must be 'keyrack'
    assertVaultIsKeyrack({ exid: input.exid });

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
   * .what = store a 1password reference in keyrack
   * .why = 1password is source of truth; keyrack stores pointer (exid)
   *
   * .note = prompts for exid if not provided
   * .note = validates roundtrip via `op read $exid`
   * .note = fails fast if op cli not installed
   */
  set: async (input) => {
    // fail fast if op cli not installed
    const opInstalled = await isOpCliInstalled();
    if (!opInstalled) {
      console.log('');
      console.log('🔐 keyrack set');
      console.log('   └─ ✗ op cli not found');
      console.log('');
      console.log('   to install on ubuntu:');
      console.log('');
      console.log('   1. install 1password app:');
      console.log(
        '      curl -sS https://downloads.1password.com/linux/keys/1password.asc | \\',
      );
      console.log(
        '        sudo gpg --dearmor --output /usr/share/keyrings/1password-archive-keyring.gpg',
      );
      console.log('');
      console.log(
        '      echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/1password-archive-keyring.gpg] https://downloads.1password.com/linux/debian/$(dpkg --print-architecture) stable main" | \\',
      );
      console.log('        sudo tee /etc/apt/sources.list.d/1password.list');
      console.log('');
      console.log('      sudo apt update && sudo apt install 1password');
      console.log('');
      console.log('   2. install 1password cli:');
      console.log('      sudo apt install 1password-cli');
      console.log('');
      console.log('   3. verify installation:');
      console.log('      op --version');
      console.log('');
      console.log('   4. authenticate:');
      console.log(
        '      open 1password app > settings > developer > "integrate with 1password cli"',
      );
      console.log('');
      // exit 2 = constraint error (user must fix before retry)
      process.exit(2);
    }

    // prompt for exid if not provided
    let exid = input.exid ?? null;
    if (!exid) {
      console.log('');
      console.log('to find a 1password uri:');
      console.log('  1. open 1password app');
      console.log('  2. find item');
      console.log('  3. right-click field → "Copy Secret Reference"');
      console.log('');
      exid = await promptVisibleInput({
        prompt: 'enter 1password uri (e.g., op://vault/item/field): ',
      });
    }

    // strip quotes (users may paste with them)
    exid = exid?.replace(/^["']|["']$/g, '') ?? null;

    // validate exid format
    if (!exid || !exid.startsWith('op://')) {
      throw new BadRequestError(
        '1password exid must be a secret reference uri (op://vault/item/field)',
        { exid },
      );
    }

    // failfast: account must be 'keyrack' (check first — if wrong account, vault check is pointless)
    await assertAccountIsKeyrack();

    // failfast: vault must be 'keyrack'
    assertVaultIsKeyrack({ exid });

    // validate roundtrip via op read
    try {
      await execOp(['read', exid]);
    } catch (error) {
      console.log('');
      console.log('🔐 keyrack set');
      console.log('   └─ ✗ invalid 1password reference: op read failed');
      console.log('');
      console.log('   the exid you entered could not be read from 1password.');
      console.log('');
      console.log('   verify:');
      console.log('   - exid format is op://vault/item/field');
      console.log('   - item exists in 1password');
      console.log('   - op cli is authenticated (run: op whoami)');
      console.log('');
      // exit 2 = constraint error (user must fix before retry)
      process.exit(2);
    }

    // return exid for host manifest storage
    return { exid };
  },

  /**
   * .what = noop — 1password item remains untouched
   * .why = 1password is a refed vault; keyrack del removes the pointer only
   *
   * .note = delKeyrackKeyHost removes the host manifest entry
   * .note = use 1password app/cli directly to manage the actual item
   */
  del: async () => {
    // noop — 1password is source of truth, keyrack only stores pointer
    // delKeyrackKeyHost handles manifest entry removal
  },
};
