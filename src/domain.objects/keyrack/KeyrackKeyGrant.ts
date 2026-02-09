import { DomainLiteral } from 'domain-objects';
import type { IsoTimeStamp } from 'iso-time';

import type { KeyrackGrantMechanism } from './KeyrackGrantMechanism';
import type { KeyrackHostVault } from './KeyrackHostVault';
import type { KeyrackKey } from './KeyrackKey';

/**
 * .what = a successfully granted credential with grade
 * .why = bundles key + source + expiration for session cache
 *
 * .note = this is the "payload" — only exists when status is 'granted'
 */
export interface KeyrackKeyGrant {
  /**
   * .what = unique identifier for the key
   * .example = 'XAI_API_KEY', 'GITHUB_APP_CREDS'
   */
  slug: string;

  /**
   * .what = the credential with its grade
   * .why = bundles secret + grade for enforcement
   */
  key: KeyrackKey;

  /**
   * .what = where this grant came from
   * .why = enables audit and debug
   */
  source: {
    vault: KeyrackHostVault;
    mech: KeyrackGrantMechanism;
  };

  /**
   * .what = when this grant expires
   * .why = enables TTL enforcement in daemon
   * .note = optional; if absent, does not expire
   */
  expiresAt?: IsoTimeStamp;
}

export class KeyrackKeyGrant
  extends DomainLiteral<KeyrackKeyGrant>
  implements KeyrackKeyGrant {}
