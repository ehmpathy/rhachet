import { DomainLiteral } from 'domain-objects';

import type { KeyrackKeySpec } from './KeyrackKeySpec';

/**
 * .what = declares which keys a repo requires
 * .why = enables repos to specify credential requirements without storage details
 *
 * location: @gitroot/.agent/keyrack.yml
 */
export interface KeyrackRepoManifest {
  /**
   * .what = map of key slug to key spec
   * .why = enables lookup by slug for grant operations
   */
  keys: Record<string, KeyrackKeySpec>;
}

export class KeyrackRepoManifest
  extends DomainLiteral<KeyrackRepoManifest>
  implements KeyrackRepoManifest {}
