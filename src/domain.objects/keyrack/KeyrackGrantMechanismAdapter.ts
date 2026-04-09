import type { IsoTimeStamp } from 'iso-time';

/**
 * .what = interface for mechanism-specific credential acquisition and delivery
 * .why = adapter pattern enables support for different credential types
 *
 * .note = vault adapters call these methods internally:
 *         - vault.set calls mech.acquireForSet to get source credential via guided setup
 *         - vault.get calls mech.deliverForGet to transform source → usable secret
 */
export interface KeyrackGrantMechanismAdapter {
  /**
   * .what = validate that a value matches the mechanism's expected format
   * .why = enables firewall to block long-lived tokens when mechanism forbids it
   *
   * .note = use { source } for source values from vault, { cached } for ephemeral values cached in os.direct
   */
  validate: (input: { source?: string; cached?: string }) => {
    valid: boolean;
    reasons?: string[];
  };

  /**
   * .what = acquire source credential via guided setup
   * .why = mech owns prompts for what it needs (e.g., org → app → pem for github app)
   *
   * .note = keySlug is fully qualified (org.env.name) for display in prompts
   * .note = mech discovers external resources independently (e.g., gh api /user/orgs)
   * .note = called by vault.set internally; secret never leaves vault scope
   */
  acquireForSet: (input: { keySlug: string }) => Promise<{ source: string }>;

  /**
   * .what = deliver usable secret from stored source credential
   * .why = some credentials require transformation (e.g., github app json → ghs_ token)
   *
   * .note = if expiresAt is returned, the translated value can be cached to os.direct
   * .note = called by vault.get internally; vault encapsulates the transformation
   */
  deliverForGet: (input: {
    source: string;
  }) => Promise<{ secret: string; expiresAt?: IsoTimeStamp }>;
}
