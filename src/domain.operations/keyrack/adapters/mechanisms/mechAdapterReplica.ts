import type { KeyrackGrantMechanismAdapter } from '@src/domain.objects/keyrack';

/**
 * .what = patterns that indicate long-lived tokens
 * .why = replica mechanism should reject these for security
 *
 * .note = these patterns match known long-lived credential formats
 */
const LONG_LIVED_PATTERNS = [
  // github classic personal access tokens
  /^ghp_[a-zA-Z0-9]{36}$/,

  // github oauth tokens
  /^gho_[a-zA-Z0-9]{36}$/,

  // github user-to-server tokens
  /^ghu_[a-zA-Z0-9]{36}$/,

  // github server-to-server tokens (long-lived)
  /^ghs_[a-zA-Z0-9]{36}$/,

  // github refresh tokens
  /^ghr_[a-zA-Z0-9]{36}$/,

  // aws long-lived access keys (format: AKIA + 16 chars)
  /^AKIA[A-Z0-9]{16}$/,
];

/**
 * .what = check if a value matches any long-lived token pattern
 * .why = enables validation to reject insecure credentials
 */
const matchesLongLivedPattern = (value: string): string | null => {
  for (const pattern of LONG_LIVED_PATTERNS) {
    if (pattern.test(value)) {
      // return description of matched pattern
      if (pattern.source.includes('ghp_')) return 'github classic pat (ghp_*)';
      if (pattern.source.includes('gho_')) return 'github oauth token (gho_*)';
      if (pattern.source.includes('ghu_'))
        return 'github user-to-server token (ghu_*)';
      if (pattern.source.includes('ghs_'))
        return 'github server-to-server token (ghs_*)';
      if (pattern.source.includes('ghr_'))
        return 'github refresh token (ghr_*)';
      if (pattern.source.includes('AKIA'))
        return 'aws long-lived access key (AKIA*)';
      return 'long-lived token pattern';
    }
  }
  return null;
};

/**
 * .what = mechanism adapter for replica credentials
 * .why = passthrough with validation to block long-lived tokens
 *
 * .note = replica mechanism expects short-lived or api key credentials
 * .note = rejects known long-lived token patterns for security
 */
export const mechAdapterReplica: KeyrackGrantMechanismAdapter = {
  /**
   * .what = validate that value is not a long-lived token
   * .why = firewall blocks insecure credential patterns
   *
   * .note = for replica, source and cached use same validation (passthrough)
   */
  validate: (input) => {
    const value = input.source ?? input.cached;
    if (!value) return { valid: false, reason: 'no value to validate' };

    const matched = matchesLongLivedPattern(value);
    if (matched) {
      return {
        valid: false,
        reason: `replica mechanism rejects long-lived tokens: detected ${matched}`,
      };
    }
    return { valid: true };
  },

  /**
   * .what = passthrough translation for replica credentials
   * .why = replica credentials require no transformation
   *
   * .note = replica never sets expiresAt — the credential is used as-is
   */
  translate: async (input) => {
    return { secret: input.secret };
  },
};
