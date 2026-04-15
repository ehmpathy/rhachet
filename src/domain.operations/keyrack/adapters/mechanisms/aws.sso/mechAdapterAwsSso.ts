import { UnexpectedCodePathError } from 'helpful-errors';
import { addDuration, asIsoTimeStamp, isIsoTimeStamp } from 'iso-time';

import type { KeyrackGrantMechanismAdapter } from '@src/domain.objects/keyrack';

import { exec, execSync } from 'node:child_process';
import { promisify } from 'node:util';
import { setupAwsSsoWithGuide } from './setupAwsSsoWithGuide';

const execAsync = promisify(exec);

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
   * .note = uses AWS_CREDENTIAL_EXPIRATION if available, else 55 min buffer
   */
  deliverForGet: async (input) => {
    const profile = input.source;

    try {
      // export credentials as json
      const { stdout } = await execAsync(
        `aws configure export-credentials --profile "${profile}" --format env-no-export`,
      );

      // parse the env output into json
      const lines = stdout.trim().split('\n');
      const credentials: Record<string, string> = {};

      for (const line of lines) {
        const match = line.match(/^([A-Z_]+)=(.*)$/);
        if (match) {
          const key = match[1];
          const value = match[2];
          if (key) credentials[key] = value ?? '';
        }
      }

      if (
        !credentials.AWS_ACCESS_KEY_ID ||
        !credentials.AWS_SECRET_ACCESS_KEY
      ) {
        throw new UnexpectedCodePathError(
          'aws sso export did not return expected credentials',
          { stdout, credentials },
        );
      }

      // use AWS_CREDENTIAL_EXPIRATION if available, else default to 55 min from now
      const awsExpiration = credentials.AWS_CREDENTIAL_EXPIRATION;
      const expiresAt =
        awsExpiration && isIsoTimeStamp(awsExpiration)
          ? awsExpiration
          : addDuration(asIsoTimeStamp(new Date()), { minutes: 55 });

      return { secret: JSON.stringify(credentials), expiresAt };
    } catch (error) {
      if (error instanceof UnexpectedCodePathError) throw error;

      throw new UnexpectedCodePathError('aws sso credential refresh failed', {
        profile,
        error,
      });
    }
  },
};
