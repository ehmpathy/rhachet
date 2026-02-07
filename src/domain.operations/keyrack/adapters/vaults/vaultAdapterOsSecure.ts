import { Decrypter, Encrypter } from 'age-encryption';
import { asHashSha256Sync } from 'hash-fns';
import { UnexpectedCodePathError } from 'helpful-errors';

import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import type { KeyrackHostVaultAdapter } from '../../../../domain.objects/keyrack';
import { promptHiddenInput } from '../../../../infra/promptHiddenInput';

/**
 * .what = resolves the home directory
 * .why = uses HOME env var to support test isolation
 *
 * .note = os.homedir() caches at module load; we read process.env.HOME directly
 */
const getHomeDir = (): string => {
  const home = process.env.HOME;
  if (!home) throw new UnexpectedCodePathError('HOME not set', {});
  return home;
};

/**
 * .what = directory for encrypted credential files
 * .why = stores age-encrypted files at ~/.rhachet/keyrack.secure/
 */
const getSecureVaultDir = (): string => {
  const home = getHomeDir();
  return join(home, '.rhachet', 'keyrack.secure');
};

/**
 * .what = path for a specific credential file
 * .why = each credential is stored as a separate .age file
 */
const getCredentialPath = (slug: string): string => {
  const hash = asHashSha256Sync(slug).slice(0, 16);
  return join(getSecureVaultDir(), `${hash}.age`);
};

/**
 * .what = session state for the os.secure vault
 * .why = tracks the unlock passphrase for the current session
 *
 * .note = the passphrase is held in memory only for the session lifetime
 * .note = KEYRACK_PASSPHRASE env var can be used as fallback for CLI chained commands
 */
let sessionPassphrase: string | null = null;

/**
 * .what = get the active passphrase from session or env
 * .why = enables passphrase to persist across CLI invocations via env var
 */
const getActivePassphrase = (): string | null => {
  return sessionPassphrase ?? process.env.KEYRACK_PASSPHRASE ?? null;
};

/**
 * .what = vault adapter for os-secure storage
 * .why = stores credentials in age-encrypted files with passphrase protection
 *
 * .note = os.secure requires explicit unlock — the passphrase is held in memory
 */
export const vaultAdapterOsSecure: KeyrackHostVaultAdapter = {
  /**
   * .what = unlock the vault for the current session
   * .why = captures the passphrase for subsequent get/set operations
   *
   * .note = passphrase can be provided via:
   *   1. input.passphrase (programmatic)
   *   2. KEYRACK_PASSPHRASE env var (secure for cli chained commands)
   *   3. interactive prompt with hidden input (human interactive)
   */
  unlock: async (input: { passphrase?: string }) => {
    // check input param first
    if (input.passphrase) {
      sessionPassphrase = input.passphrase;
      return;
    }

    // check env var second (secure — no shell history or process list exposure)
    if (process.env.KEYRACK_PASSPHRASE) {
      sessionPassphrase = process.env.KEYRACK_PASSPHRASE;
      return;
    }

    // prompt interactively with hidden input (human interactive)
    const passphrase = await promptHiddenInput({
      prompt: '🔐 os.secure passphrase: ',
    });

    // validate passphrase was provided
    if (!passphrase) {
      throw new UnexpectedCodePathError(
        'os.secure unlock requires passphrase',
        {
          input,
        },
      );
    }

    sessionPassphrase = passphrase;
  },

  /**
   * .what = check if the vault is unlocked
   * .why = returns true if a passphrase is available (session or env)
   */
  isUnlocked: async () => {
    return getActivePassphrase() !== null;
  },

  /**
   * .what = retrieve a credential from the encrypted vault
   * .why = decrypts the age file with the session passphrase
   */
  get: async (input) => {
    // fail if vault is locked
    const passphrase = getActivePassphrase();
    if (!passphrase)
      throw new UnexpectedCodePathError('os.secure vault is locked', { input });

    // return null if file does not exist
    const path = getCredentialPath(input.slug);
    if (!existsSync(path)) return null;

    // read and decrypt
    const ciphertext = readFileSync(path);
    const decrypter = new Decrypter();
    decrypter.addPassphrase(passphrase);
    const plaintext = await decrypter.decrypt(ciphertext, 'text');
    return plaintext;
  },

  /**
   * .what = store a credential in the encrypted vault
   * .why = encrypts with age and writes to disk
   */
  set: async (input) => {
    // fail if vault is locked
    const passphrase = getActivePassphrase();
    if (!passphrase)
      throw new UnexpectedCodePathError('os.secure vault is locked', { input });

    // ensure directory exists
    const dir = getSecureVaultDir();
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // encrypt and write
    const encrypter = new Encrypter();
    encrypter.setPassphrase(passphrase);
    const ciphertext = await encrypter.encrypt(input.value);
    const path = getCredentialPath(input.slug);
    writeFileSync(path, Buffer.from(ciphertext));
  },

  /**
   * .what = remove a credential from the encrypted vault
   * .why = deletes the age file from disk
   */
  del: async (input) => {
    const path = getCredentialPath(input.slug);
    if (existsSync(path)) {
      unlinkSync(path);
    }
  },
};
