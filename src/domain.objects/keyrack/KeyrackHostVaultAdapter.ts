import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';

import type { KeyrackGrantMechanism } from './KeyrackGrantMechanism';

/**
 * .what = interface for vault-specific operations
 * .why = adapter pattern enables support for multiple storage backends
 *
 * .note = vaults encapsulate secret operations:
 *         - set calls mech.acquireForSet internally; secret never exposed to caller
 *         - get calls mech.deliverForGet internally; transforms source → usable secret
 */
export interface KeyrackHostVaultAdapter {
  /**
   * .what = mechanisms supported by this vault
   * .why = enables mech inference and fail-fast for incompatible mechs
   */
  mechs: {
    supported: KeyrackGrantMechanism[];
  };
  /**
   * .what = unlock the vault for the current session
   * .why = enables subsequent get operations without re-authentication
   *
   * .note = identity is for os.secure vault (age encryption via ssh key)
   * .note = silent mode for aws.config vault (suppress cli output)
   */
  unlock: (input: {
    identity: string | null;
    silent?: boolean;
    exid?: string | null;
  }) => Promise<void>;

  /**
   * .what = check if the vault is unlocked
   * .why = enables skip of unlock prompt if already unlocked
   *
   * .note = exid is optional; aws.config uses it to validate sso session for the profile
   * .note = identity is optional; os.secure uses it for session state check
   */
  isUnlocked: (input?: {
    exid?: string | null;
    identity?: string | null;
  }) => Promise<boolean>;

  /**
   * .what = retrieve a credential from the vault
   * .why = core operation for grant flow
   *
   * .note = vault encapsulates mech transformation:
   *         1. retrieve source from storage
   *         2. call mech.deliverForGet({ source }) if mech supplied
   *         3. return translated secret (or source if no mech)
   * .note = mech is optional; if not supplied, returns source as-is
   * .note = exid is optional; only 1password requires it
   * .note = vaultRecipient is optional; only os.secure uses it for recipient-based encryption
   * .note = owner is optional; enables per-owner vault isolation (os.direct, os.secure)
   * .note = identity is optional; os.secure uses it for age decryption
   */
  get: (input: {
    slug: string;
    mech?: KeyrackGrantMechanism | null;
    exid?: string | null;
    vaultRecipient?: string | null;
    owner?: string | null;
    identity?: string | null;
  }) => Promise<string | null>;

  /**
   * .what = store a credential in the vault
   * .why = enables set flow for credential storage
   *
   * .note = vault encapsulates secret acquisition:
   *         1. infers mech if not supplied (via inferKeyrackMechForSet)
   *         2. checks mech compat (fail-fast if not in mechs.supported)
   *         3. calls mech.acquireForSet({ keySlug }) to get source via guided setup
   *         4. stores source credential
   * .note = secret never leaves vault scope; caller never sees it
   * .note = mech is optional; if not supplied, vault infers or prompts
   * .note = exid is optional; only 1password requires it
   * .note = expiresAt is optional; enables ephemeral grant cache (os.direct only)
   * .note = returns { mech } so orchestrator can record what mech was used
   * .note = may also return { exid } when the adapter derives an exid (e.g., aws.config profile name)
   * .note = context provides: owner, hostManifest.recipients, identity for verification
   */
  set: (
    input: {
      slug: string;
      mech?: KeyrackGrantMechanism | null;
      exid?: string | null;
      expiresAt?: string | null;
    },
    context?: ContextKeyrack,
  ) => Promise<{ mech: KeyrackGrantMechanism; exid?: string }>;

  /**
   * .what = remove a credential from the vault
   * .why = enables del flow for credential removal
   *
   * .note = exid is optional; only 1password requires it
   * .note = owner is optional; enables per-owner vault isolation (os.direct, os.secure)
   */
  del: (input: {
    slug: string;
    exid?: string | null;
    owner?: string | null;
  }) => Promise<void>;

  /**
   * .what = clear cached credentials for a key (optional)
   * .why = enables relock flow for vaults with external caches
   *
   * .note = optional; only vaults with external caches need this
   * .note = aws.config uses this to clear ~/.aws/sso/cache and ~/.aws/cli/cache
   */
  relock?: (input: { slug: string; exid?: string | null }) => Promise<void>;
}
