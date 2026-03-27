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
 * .what = vault adapter for os-secure storage
 * .why = stores credentials in age-encrypted files with identity-based encryption
 *
 * .note = os.secure requires identity from context for all operations
 */
export const vaultAdapterOsSecure: KeyrackHostVaultAdapter = {
  /**
   * .what = unlock the vault for the current session
   * .why = validates identity is available for subsequent operations
   *
   * .note = identity flows through context, not session state
   */
  unlock: async (input: { identity: string | null }) => {
    // identity required for os.secure
    if (input.identity === null) {
      throw new UnexpectedCodePathError('os.secure unlock requires identity', {
        hint: 'use --prikey to specify ssh key or run keyrack init',
      });
    }
    // no-op — identity will be passed to get/isUnlocked via context
  },

  /**
   * .what = check if the vault is unlocked
   * .why = returns true if identity is available in input
   */
  isUnlocked: async (input) => {
    return input?.identity !== null && input?.identity !== undefined;
  },

  /**
   * .what = retrieve a credential from the encrypted vault
   * .why = decrypts the age file with identity from input
   */
  get: async (input) => {
    // return null if file does not exist
    const owner = input.owner ?? null;
    const path = getCredentialPath({ slug: input.slug, owner });
    if (!existsSync(path)) return null;

    // identity required for decryption
    const identity = input.identity ?? null;
    if (!identity) {
      throw new UnexpectedCodePathError('os.secure vault is locked', {
        input,
        hint: 'identity must be passed via context',
      });
    }

    // decrypt with identity (recipient-encrypted credentials)
    const ciphertextArmored = readFileSync(path, 'utf8');
    const plaintext = await decryptWithIdentity({
      ciphertext: ciphertextArmored,
      identity,
    });
    return plaintext;
  },

  /**
   * .what = store a credential in the encrypted vault
   * .why = encrypts with age to recipients and writes to disk
   */
  set: async (input) => {
    // vault always prompts for its own secret via stdin
    const secret = await promptHiddenInput({
      prompt: `enter secret for ${input.slug}: `,
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
        plaintext: secret,
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
        plaintext: secret,
        recipients: input.recipients,
      });
      writeFileSync(path, ciphertext, 'utf8');
      return;
    }

    // no recipients available
    throw new UnexpectedCodePathError(
      'os.secure set requires recipients (vaultRecipient or manifest recipients)',
      {
        slug: input.slug,
        hint: 'use --prikey to specify ssh key or run keyrack init',
      },
    );
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
