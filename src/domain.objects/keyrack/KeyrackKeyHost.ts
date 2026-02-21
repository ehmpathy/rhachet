import { DomainLiteral } from 'domain-objects';

import type { KeyrackGrantMechanism } from './KeyrackGrantMechanism';
import type { KeyrackHostVault } from './KeyrackHostVault';

/**
 * .what = storage host for a single key on this machine
 * .why = tells keyrack where to find credentials and how to translate them
 */
export interface KeyrackKeyHost {
  /**
   * .what = unique identifier for the key
   * .example = 'XAI_API_KEY', 'GITHUB_APP_CREDS'
   */
  slug: string;

  /**
   * .what = external reference for vault lookup
   * .why = some vaults (e.g., 1password) use external ids
   * .example = 'op://vault/item/field' for 1password
   */
  exid: string | null;

  /**
   * .what = which vault stores this key
   */
  vault: KeyrackHostVault;

  /**
   * .what = mechanism for credential translation
   */
  mech: KeyrackGrantMechanism;

  /**
   * .what = which env this key belongs to
   * .why = 'sudo' keys are invisible to codebase; others appear in keyrack.yml
   * .example = 'sudo', 'prod', 'prep', 'all'
   */
  env: string;

  /**
   * .what = which org this key belongs to
   * .why = enables org-scoped access and cross-org credentials
   * .example = 'ehmpathy', '@all' (for cross-org)
   */
  org: string;

  /**
   * .what = optional pubkey for os.secure vault if different from manifest
   * .why = enables separate key for high-value credentials
   * .example = 'ssh-ed25519 AAAA...'
   */
  vaultRecipient: string | null;

  /**
   * .what = optional max TTL for this key
   * .why = caps unlock duration for sensitive credentials
   * .example = '30m', '1h', '5m'
   */
  maxDuration: string | null;

  /**
   * .what = when this host entry was created
   */
  createdAt: string;

  /**
   * .what = when this host entry was last updated
   */
  updatedAt: string;
}

export class KeyrackKeyHost
  extends DomainLiteral<KeyrackKeyHost>
  implements KeyrackKeyHost {}
