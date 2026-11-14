import type { KeyrackGrantMechanismAdapter } from '@src/domain.objects/keyrack';
import { assertKeyrackReachAbsent } from '@src/domain.operations/keyrack/reach/assertKeyrackReachAbsent';

import { execSync } from 'node:child_process';
import { genAwsProfileExport } from './genAwsProfileExport';
import { setupAwsSsoWithGuide } from './setupAwsSsoWithGuide';

/**
 * .what = validate that profile name is a valid format
 * .why = ensures stored value is a plausible aws profile name
 */
const isValidProfileName = (value: string): boolean => {
  // profile names should be alphanumeric with dashes and underscores
  // typically follow pattern like 'org-name.dev' or 'org_name_prod'
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value);
};

/**
 * .what = mechanism adapter for aws sso credentials
 * .why = translates sso profile name into session credentials json
 *
 * .note = expects stored value to be an aws profile name
 * .note = uses aws cli to refresh sso and export credentials
 */
/**
 * .what = validate cached aws sso credentials json
 * .why = ensures cached value has required credential fields
 */
const isValidCachedCredentials = (
  value: string,
): { valid: true } | { valid: false; reasons: string[] } => {
  try {
    const creds = JSON.parse(value);
    if (!creds.AWS_ACCESS_KEY_ID) {
      return {
        valid: false,
        reasons: ['cached credentials lack AWS_ACCESS_KEY_ID'],
      };
    }
    if (!creds.AWS_SECRET_ACCESS_KEY) {
      return {
        valid: false,
        reasons: ['cached credentials lack AWS_SECRET_ACCESS_KEY'],
      };
    }
    return { valid: true };
  } catch {
    return { valid: false, reasons: ['cached value is not valid json'] };
  }
};

export const mechAdapterAwsSso: KeyrackGrantMechanismAdapter = {
  /**
   * .what = validate that value is a valid aws profile name
   * .why = ensures stored value can be used with aws cli --profile flag
   *
   * .note = source and cached both expect profile name (alphanumeric with dashes/underscores/dots)
   * .note = sso session validation happens at access time, not at cache validation time
   * .note = profile name is returned by keyrack get, user sets AWS_PROFILE env var directly
   */
  validate: (input) => {
    // validate cached value (profile name)
    // .note = vault adapter now returns profile name, not credentials json
    // .note = user sets AWS_PROFILE=$(rhx keyrack get ...), AWS SDK resolves creds from profile
    if (input.cached) {
      if (!isValidProfileName(input.cached)) {
        return {
          valid: false,
          reasons: ['aws_sso: cached value is not a valid aws profile name'],
        };
      }
      return { valid: true };
    }

    // validate source credential (profile name)
    if (input.source) {
      // check profile name format
      if (!isValidProfileName(input.source)) {
        return {
          valid: false,
          reasons: ['aws_sso: value is not a valid aws profile name format'],
        };
      }

      // validate sso session via sts get-caller-identity
      try {
        execSync(`aws sts get-caller-identity --profile "${input.source}"`, {
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        return { valid: true };
      } catch {
        return { valid: false, reasons: ['aws_sso: sso session expired'] };
      }
    }

    return { valid: false, reasons: ['no value to validate'] };
  },

  /**
   * .what = acquire source credential via guided setup
   * .why = prompts user through sso portal → account → role → profile selection
   *
   * .note = keySlug is fully qualified (org.env.name) for display in prompts
   * .note = delegates to setupAwsSsoWithGuide for interactive flow
   * .note = writes profile to ~/.aws/config
   */
  acquireForSet: async (input) => {
    // an sso profile's reach is the aws account+role the portal grants, picked in the
    // guided flow — a github reach names no thing this mech can act on. refuse rather than
    // drop. an `aws://account=…` scheme could be honored here later; none exists today
    // the mech name comes from the CALLER, never from a literal here: this same adapter
    // object is registered under EPHEMERAL_VIA_GITHUB_OIDC too, so a hardcoded name would
    // report an oidc key's refusal as an sso one — a correct refusal that names the wrong mech
    assertKeyrackReachAbsent({ reach: input.reach, mech: input.mech });

    // extract org from keySlug (org.env.keyName)
    const org = input.keySlug.split('.')[0] ?? '';

    // run guided setup
    const { profileName } = await setupAwsSsoWithGuide({ org });

    return { source: profileName };
  },

  /**
   * .what = deliver usable secret from stored source credential
   * .why = transforms sso profile name into session credentials
   *
   * .note = assumes sso session is valid (vault unlock handles login)
   * .note = through the single-flight export, so a burst of callers runs the cli once
   */
  deliverForGet: async (input) => {
    const { credentials, expiresAt } = await genAwsProfileExport({
      profile: input.source,
      refresh: false,
    });
    return { secret: JSON.stringify(credentials), expiresAt };
  },
};
