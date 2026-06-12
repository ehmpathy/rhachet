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
   * .what = mechanism constraint for this key, or null if not declared
   * .why = enables firewall to block long-lived tokens when short-lived alternatives exist
   * .note = null means no constraint — vault adapter will prompt for mech selection
   */
  mech: KeyrackGrantMechanism | null;

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

  /**
   * .what = behavioral flags that modify how keyrack handles this key
   * .why = separates flags from core identity (env, name) and constraints (grade, mech)
   */
  flags: {
    /**
     * .what = key name that waives this requirement if set in process.env
     * .why = enables strict mode to pass when alternative auth is present (e.g., CI OIDC)
     * .note = does NOT mean keyrack grants the alternative; just waives this requirement
     */
    isOptionalIfHas: string | null;
  };
}

export class KeyrackKeySpec
  extends DomainLiteral<KeyrackKeySpec>
  implements KeyrackKeySpec {}
