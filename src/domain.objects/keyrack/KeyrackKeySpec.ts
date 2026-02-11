import { DomainLiteral } from 'domain-objects';

import type { KeyrackGrantMechanism } from './KeyrackGrantMechanism';

/**
 * .what = specification for a single required key within an env-scoped keyrack
 * .why = declares the slug, env, raw name, mechanism constraint, and grade minimum for a key
 */
export interface KeyrackKeySpec {
  /**
   * .what = unique identifier for the key in $org.$env.$key format
   * .example = 'ehmpathy.prod.AWS_PROFILE', 'ehmpathy.prep.XAI_API_KEY'
   */
  slug: string;

  /**
   * .what = mechanism constraint for this key
   * .why = enables firewall to block long-lived tokens when short-lived alternatives exist
   */
  mech: KeyrackGrantMechanism;

  /**
   * .what = which env this key belongs to
   * .example = 'prod', 'prep', 'test'
   */
  env: string;

  /**
   * .what = raw key name without org or env prefix
   * .why = export layer needs raw names (tools expect AWS_PROFILE, not ehmpathy.prep.AWS_PROFILE)
   * .example = 'AWS_PROFILE', 'XAI_API_KEY'
   */
  name: string;

  /**
   * .what = grade minimum declared in keyrack.yml, or null for no constraint
   * .why = enables enforcement of protection and duration requirements per key per env
   */
  grade: {
    protection: 'encrypted' | null;
    duration: 'ephemeral' | null;
  } | null;
}

export class KeyrackKeySpec
  extends DomainLiteral<KeyrackKeySpec>
  implements KeyrackKeySpec {}
