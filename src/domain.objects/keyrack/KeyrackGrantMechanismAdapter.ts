import type { IsoTimeStamp } from 'iso-time';

/**
 * .what = interface for mechanism-specific translation
 * .why = adapter pattern enables support for different credential types
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
    reason?: string;
  };

  /**
   * .what = translate stored credential into usable grant value
   * .why = some credentials require transformation (e.g., github app json → token)
   *
   * .note = if expiresAt is returned, the translated value can be cached to os.direct
   */
  translate: (input: {
    value: string;
  }) => Promise<{ value: string; expiresAt?: IsoTimeStamp }>;
}
