import type { KeyrackGrantMechanismAdapter } from '@src/domain.objects/keyrack';
import { promptHiddenInput } from '@src/infra/promptHiddenInput';

/**
 * .what = patterns that indicate long-lived tokens
 * .why = replica mechanism should reject these for security
 *
 * .note = prefix-only match for firewall (block ghp_* regardless of length)
 * .note = ghs_* (server-to-server) is NOT blocked — ephemeral GitHub App tokens
 */
const LONG_LIVED_PATTERNS = [
  // github classic personal access tokens (ghp_*)
  /^ghp_/,

  // github oauth tokens (gho_*)
  /^gho_/,

  // github user-to-server tokens (ghu_*)
  /^ghu_/,

  // github refresh tokens (ghr_*)
  /^ghr_/,

  // aws long-lived access keys (AKIA*)
  /^AKIA/,
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
    if (!value) return { valid: false, reasons: ['no value to validate'] };

    const matched = matchesLongLivedPattern(value);
    if (matched) {
      return {
        valid: false,
        reasons: [
          'its dangerous to use long lived tokens via replica mechanisms',
          `detected ${matched}`,
        ],
      };
    }
    return { valid: true };
  },

  /**
   * .what = acquire source credential via guided setup
   * .why = prompts user for secret via stdin
   *
   * .note = keySlug is fully qualified (org.env.name) for display in prompts
   * .note = uses promptHiddenInput for secure password entry
   */
  acquireForSet: async (input) => {
    // .note = a replica honors a DECLARED reach: a human pastes a secret and asserts which
    //         reach it opens, so this mech carries the exid through untouched and the
    //         vault files the value under it. that is the whole of it — no scheme, no uri,
    //         no interpretation. it is what lets one key name hold N copies, one per
    //         account (the claude-account juggle)
    // .note = the exid reaches the vault via the ADDRESS, not via this prompt, so there is
    //         nothing to thread here — the reach never touches the secret itself

    // extract key name from slug for user-friendly prompt
    const keyName = input.keySlug.split('.').pop() ?? input.keySlug;

    // prompt for secret via hidden input (handles TTY and piped stdin)
    // .note = no manual prefix needed; withStdoutPrefix auto-prefixes when atLineStart
    const source = await promptHiddenInput({
      prompt: `enter secret for ${keyName}: `,
    });

    return { source };
  },

  /**
   * .what = deliver usable secret from stored source credential
   * .why = replica credentials require no transformation (identity)
   *
   * .note = replica never sets expiresAt — the credential is used as-is
   */
  deliverForGet: async (input) => {
    return { secret: input.source };
  },
};
