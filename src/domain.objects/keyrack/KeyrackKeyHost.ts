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
