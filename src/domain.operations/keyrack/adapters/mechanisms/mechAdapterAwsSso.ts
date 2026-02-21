import { UnexpectedCodePathError } from 'helpful-errors';
import { addDuration, asIsoTimeStamp, isIsoTimeStamp } from 'iso-time';

import { exec, execSync } from 'node:child_process';
import { promisify } from 'node:util';
import type { KeyrackGrantMechanismAdapter } from '../../../../domain.objects/keyrack';

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
): { valid: true } | { valid: false; reason: string } => {
  try {
    const creds = JSON.parse(value);
    if (!creds.AWS_ACCESS_KEY_ID) {
      return {
        valid: false,
        reason: 'cached credentials lack AWS_ACCESS_KEY_ID',
      };
    }
    if (!creds.AWS_SECRET_ACCESS_KEY) {
      return {
        valid: false,
        reason: 'cached credentials lack AWS_SECRET_ACCESS_KEY',
      };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'cached value is not valid json' };
  }
};

export const mechAdapterAwsSso: KeyrackGrantMechanismAdapter = {
  /**
   * .what = validate that value is a valid aws profile name or cached credentials
   * .why = ensures stored value can be used for sso refresh or cached creds are valid
   *
   * .note = source expects profile name (alphanumeric with dashes/underscores)
   * .note = cached expects json with AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
   * .note = source validation includes sso session check via sts get-caller-identity
   */
  validate: (input) => {
    // validate cached ephemeral (credentials json)
    if (input.cached) {
      return isValidCachedCredentials(input.cached);
    }

    // validate source credential (profile name)
    if (input.source) {
      // check profile name format
      if (!isValidProfileName(input.source)) {
        return {
          valid: false,
          reason: 'aws_sso: value is not a valid aws profile name format',
        };
      }

      // validate sso session via sts get-caller-identity
      try {
        execSync(`aws sts get-caller-identity --profile "${input.source}"`, {
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        return { valid: true };
      } catch {
        return { valid: false, reason: 'aws_sso: sso session expired' };
      }
    }

    return { valid: false, reason: 'no value to validate' };
  },

  /**
   * .what = translate aws sso profile to session credentials
   * .why = generates short-lived credentials from sso profile
   *
   * .note = assumes sso session is valid (vault unlock handles login)
   * .note = uses AWS_CREDENTIAL_EXPIRATION if available, else 55 min buffer
   */
  translate: async (input) => {
    const profile = input.secret;

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
