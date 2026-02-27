import * as age from 'age-encryption';
import { asHashSha256Sync } from 'hash-fns';
import { UnexpectedCodePathError } from 'helpful-errors';

import {
  type KeyrackHostVaultAdapter,
  KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';
import {
  decryptWithIdentity,
  encryptToRecipients,
} from '@src/domain.operations/keyrack/adapters/ageRecipientCrypto';
import { promptHiddenInput } from '@src/infra/promptHiddenInput';

import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

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
 * .why = stores age-encrypted files at ~/.rhachet/keyrack/vault/os.secure/owner={owner}/
 *
 * .note = owner enables per-owner vault isolation
 */
const getSecureVaultDir = (input: { owner: string | null }): string => {
  const home = getHomeDir();
  const ownerDir = `owner=${input.owner ?? 'default'}`;
  return join(home, '.rhachet', 'keyrack', 'vault', 'os.secure', ownerDir);
};

/**
 * .what = path for a specific credential file
 * .why = each credential is stored as a separate .age file
 */
const getCredentialPath = (input: {
  slug: string;
  owner: string | null;
}): string => {
  const hash = asHashSha256Sync(input.slug).slice(0, 16);
  return join(getSecureVaultDir({ owner: input.owner }), `${hash}.age`);
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
 * .what = session state for the age identity
 * .why = tracks the decryption identity for recipient-based encryption
 *
 * .note = identity is held in memory only for the session lifetime
 * .note = identity is set via setOsSecureSessionIdentity from manifest decryption
 */
let sessionIdentity: string | null = null;

/**
 * .what = get the active passphrase from session or env
 * .why = enables passphrase to persist across CLI invocations via env var
 */
const getActivePassphrase = (): string | null => {
  return sessionPassphrase ?? process.env.KEYRACK_PASSPHRASE ?? null;
};

/**
 * .what = get the active identity from session
 * .why = enables identity-based decryption for recipient-encrypted credentials
 */
const getActiveIdentity = (): string | null => {
  return sessionIdentity;
};

/**
 * .what = set the session identity for recipient-based decryption
 * .why = enables vault decryption with same identity as manifest
 */
export const setOsSecureSessionIdentity = (identity: string | null): void => {
  sessionIdentity = identity;
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
   * .why = captures the identity or passphrase for subsequent get/set operations
   *
   * .note = unlock can use identity (preferred) or passphrase (legacy):
   *   1. input.identity (programmatic, set from manifest decryption)
   *   2. input.passphrase (programmatic, legacy)
   *   3. KEYRACK_PASSPHRASE env var (legacy)
   *   4. interactive prompt with hidden input (human interactive, legacy)
   */
  unlock: async (input: { passphrase?: string; identity?: string }) => {
    // check identity input param first (preferred path — set from manifest decryption)
    if (input.identity) {
      sessionIdentity = input.identity;
      return;
    }

    // check passphrase input param (legacy path)
    if (input.passphrase) {
      sessionPassphrase = input.passphrase;
      return;
    }

    // check passphrase env var (legacy)
    if (process.env.KEYRACK_PASSPHRASE) {
      sessionPassphrase = process.env.KEYRACK_PASSPHRASE;
      return;
    }

    // prompt interactively with hidden input (human interactive, legacy)
    const passphrase = await promptHiddenInput({
      prompt: '🔐 os.secure passphrase: ',
    });

    // validate passphrase was provided
    if (!passphrase) {
      throw new UnexpectedCodePathError(
        'os.secure unlock requires identity or passphrase',
        {
          input,
          hint: 'unlock the manifest first, or provide a passphrase',
        },
      );
    }

    sessionPassphrase = passphrase;
  },

  /**
   * .what = check if the vault is unlocked
   * .why = returns true if an identity or passphrase is available (session or env)
   */
  isUnlocked: async () => {
    return getActiveIdentity() !== null || getActivePassphrase() !== null;
  },

  /**
   * .what = retrieve a credential from the encrypted vault
   * .why = decrypts the age file with identity or passphrase
   *
   * .note = tries identity-based decryption first (recipient-encrypted)
   * .note = falls back to passphrase-based decryption (legacy behavior)
   */
  get: async (input) => {
    // return null if file does not exist
    const owner = input.owner ?? null;
    const path = getCredentialPath({ slug: input.slug, owner });
    if (!existsSync(path)) return null;

    // try identity-based decryption first (recipient-encrypted credentials)
    // note: read as text since encryptToRecipients outputs armored format
    const identity = getActiveIdentity();
    if (identity) {
      const ciphertextArmored = readFileSync(path, 'utf8');
      const plaintext = await decryptWithIdentity({
        ciphertext: ciphertextArmored,
        identity,
      });
      return plaintext;
    }

    // read ciphertext as bytes for passphrase-based decryption (legacy binary format)
    const ciphertextBytes = readFileSync(path);

    // fall back to passphrase-based decryption (legacy)
    const passphrase = getActivePassphrase();
    if (!passphrase)
      throw new UnexpectedCodePathError('os.secure vault is locked', {
        input,
        note: 'no identity and no passphrase available',
      });

    // decrypt with passphrase
    const decrypter = new age.Decrypter();
    decrypter.addPassphrase(passphrase);
    const plaintext = await decrypter.decrypt(ciphertextBytes, 'text');
    return plaintext;
  },

  /**
   * .what = store a credential in the encrypted vault
   * .why = encrypts with age and writes to disk
   *
   * .note = if vaultRecipient provided, encrypts to that recipient
   * .note = if no vaultRecipient, encrypts with passphrase (legacy behavior)
   */
  set: async (input) => {
    // secret is required for os.secure vault
    if (!input.secret)
      throw new UnexpectedCodePathError('secret required for os.secure vault', {
        slug: input.slug,
      });

    // ensure directory exists
    const owner = input.owner ?? null;
    const dir = getSecureVaultDir({ owner });
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const path = getCredentialPath({ slug: input.slug, owner });

    // if vaultRecipient specified, use recipient-based encryption (single recipient)
    if (input.vaultRecipient) {
      const mech = input.vaultRecipient.startsWith('ssh-') ? 'ssh' : 'age';
      const ciphertext = await encryptToRecipients({
        plaintext: input.secret,
        recipients: [
          new KeyrackKeyRecipient({
            mech,
            pubkey: input.vaultRecipient,
            label: 'vault-recipient',
            addedAt: new Date().toISOString(),
          }),
        ],
      });
      writeFileSync(path, ciphertext, 'utf8');
      return;
    }

    // if recipients array provided (from manifest), use those
    if (input.recipients && input.recipients.length > 0) {
      const ciphertext = await encryptToRecipients({
        plaintext: input.secret,
        recipients: input.recipients,
      });
      writeFileSync(path, ciphertext, 'utf8');
      return;
    }

    // fall back to passphrase-based encryption (legacy)
    const passphrase = getActivePassphrase();
    if (!passphrase)
      throw new UnexpectedCodePathError('os.secure vault is locked', {
        input,
        note: 'no vaultRecipient, no manifest recipients, and no passphrase available',
      });

    const encrypter = new age.Encrypter();
    encrypter.setPassphrase(passphrase);
    const ciphertext = await encrypter.encrypt(input.secret);
    writeFileSync(path, Buffer.from(ciphertext));
  },

  /**
   * .what = remove a credential from the encrypted vault
   * .why = deletes the age file from disk
   */
  del: async (input) => {
    const owner = input.owner ?? null;
    const path = getCredentialPath({ slug: input.slug, owner });
    if (existsSync(path)) {
      unlinkSync(path);
    }
  },
};
