import { DomainLiteral } from 'domain-objects';

import type { KeyrackGrantMechanism } from './KeyrackGrantMechanism';

/**
 * .what = specification for a single required key
 * .why = declares the mechanism constraint for firewall enforcement
 */
export interface KeyrackKeySpec {
  /**
   * .what = unique identifier for the key
   * .example = 'XAI_API_KEY', 'GITHUB_APP_CREDS'
   */
  slug: string;

  /**
   * .what = mechanism constraint for this key
   * .why = enables firewall to block long-lived tokens when short-lived alternatives exist
   */
  mech: KeyrackGrantMechanism;
}

export class KeyrackKeySpec
  extends DomainLiteral<KeyrackKeySpec>
  implements KeyrackKeySpec {}
