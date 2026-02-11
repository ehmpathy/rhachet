import { DomainLiteral } from 'domain-objects';

import type { KeyrackKeySpec } from './KeyrackKeySpec';

/**
 * .what = declares which keys a repo requires, scoped by org and env
 * .why = enables repos to specify credential requirements per env without storage details
 *
 * location: @gitroot/.agent/keyrack.yml
 */
export interface KeyrackRepoManifest {
  /**
   * .what = org name that owns this keyrack
   * .why = org prefix in slugs isolates credentials across orgs
   * .example = 'ehmpathy', 'ahbode'
   */
  org: string;

  /**
   * .what = declared env names derived from env.* sections (except env.all)
   * .why = enables --env validation and error messages that list available envs
   * .example = ['prod', 'prep']
   */
  envs: string[];

  /**
   * .what = map of key slug ($org.$env.$key) to key spec
   * .why = enables lookup by slug for grant operations
   */
  keys: Record<string, KeyrackKeySpec>;
}

export class KeyrackRepoManifest
  extends DomainLiteral<KeyrackRepoManifest>
  implements KeyrackRepoManifest {}
