import type { KeyrackKeyRecipient } from './KeyrackKeyRecipient';

/**
 * .what = interface for vault-specific operations
 * .why = adapter pattern enables support for multiple storage backends
 */
export interface KeyrackHostVaultAdapter {
  /**
   * .what = unlock the vault for the current session
   * .why = enables subsequent get operations without re-authentication
   *
   * .note = passphrase is for os.secure vault (keychain unlock)
   * .note = silent mode for aws.iam.sso vault (suppress cli output)
   */
  unlock: (input: {
    passphrase?: string;
    silent?: boolean;
    exid?: string | null;
  }) => Promise<void>;

  /**
   * .what = check if the vault is unlocked
   * .why = enables skip of unlock prompt if already unlocked
   *
   * .note = exid is optional; aws.iam.sso uses it to validate sso session for the profile
   */
  isUnlocked: (input?: { exid?: string | null }) => Promise<boolean>;

  /**
   * .what = retrieve a credential from the vault
   * .why = core operation for grant flow
   *
   * .note = exid is optional; only 1password requires it
   * .note = vaultRecipient is optional; only os.secure uses it for recipient-based encryption
   */
  get: (input: {
    slug: string;
    exid?: string | null;
    vaultRecipient?: string | null;
  }) => Promise<string | null>;

  /**
   * .what = store a credential in the vault
   * .why = enables set flow for credential storage
   *
   * .note = env and org are required; callers must resolve them before the vault adapter call
   * .note = exid is optional; only 1password requires it
   * .note = expiresAt is optional; enables ephemeral grant cache (os.direct only)
   * .note = vaultRecipient is optional; only os.secure uses it for recipient-based encryption
   * .note = recipients is optional; os.secure uses it when no vaultRecipient (uses manifest recipients)
   * .note = may return { exid } when the adapter derives an exid (e.g., aws.iam.sso guided setup)
   */
  set: (input: {
    slug: string;
    secret: string | null;
    env: string;
    org: string;
    exid?: string | null;
    expiresAt?: string | null;
    vaultRecipient?: string | null;
    recipients?: KeyrackKeyRecipient[];
  }) => Promise<void | { exid: string }>;

  /**
   * .what = remove a credential from the vault
   * .why = enables del flow for credential removal
   *
   * .note = exid is optional; only 1password requires it
   */
  del: (input: { slug: string; exid?: string | null }) => Promise<void>;

  /**
   * .what = clear cached credentials for a key (optional)
   * .why = enables relock flow for vaults with external caches
   *
   * .note = optional; only vaults with external caches need this
   * .note = aws.iam.sso uses this to clear ~/.aws/sso/cache and ~/.aws/cli/cache
   */
  relock?: (input: { slug: string; exid?: string | null }) => Promise<void>;
}
