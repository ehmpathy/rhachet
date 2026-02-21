import { createAppAuth } from '@octokit/auth-app';
import { UnexpectedCodePathError } from 'helpful-errors';
import { addDuration, asIsoTimeStamp } from 'iso-time';

import type { KeyrackGrantMechanismAdapter } from '../../../../domain.objects/keyrack';

/**
 * .what = expected shape of github app credentials json
 * .why = validates that stored value contains required fields
 */
interface GithubAppCredentials {
  appId: string | number;
  privateKey: string;
  installationId: string | number;
}

/**
 * .what = parse and validate github app credentials json
 * .why = ensures stored value has required fields for token generation
 */
const parseGithubAppCredentials = (
  value: string,
):
  | { valid: true; creds: GithubAppCredentials }
  | { valid: false; reason: string } => {
  // attempt to parse as json
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { valid: false, reason: 'value is not valid json' };
  }

  // validate required fields
  if (typeof parsed !== 'object' || parsed === null) {
    return { valid: false, reason: 'value is not a json object' };
  }

  const obj = parsed as Record<string, unknown>;

  if (!obj.appId && !obj.app_id) {
    return { valid: false, reason: 'json lacks appId or app_id field' };
  }

  if (!obj.privateKey && !obj.private_key) {
    return {
      valid: false,
      reason: 'json lacks privateKey or private_key field',
    };
  }

  if (!obj.installationId && !obj.installation_id) {
    return {
      valid: false,
      reason: 'json lacks installationId or installation_id field',
    };
  }

  // normalize field names
  const creds: GithubAppCredentials = {
    appId: (obj.appId ?? obj.app_id) as string | number,
    privateKey: (obj.privateKey ?? obj.private_key) as string,
    installationId: (obj.installationId ?? obj.installation_id) as
      | string
      | number,
  };

  return { valid: true, creds };
};

/**
 * .what = mechanism adapter for github app credentials
 * .why = translates stored app credentials json into short-lived installation token
 *
 * .note = expects json with appId, privateKey, installationId
 * .note = generates short-lived (1 hour) installation access token
 */
export const mechAdapterGithubApp: KeyrackGrantMechanismAdapter = {
  /**
   * .what = validate that value is valid github app credentials json
   * .why = ensures stored credential can be translated to token
   *
   * .note = source expects json blob with appId, privateKey, installationId
   * .note = cached expects ghs_ token (already translated)
   */
  validate: (input) => {
    // validate cached ephemeral (ghs_ token)
    if (input.cached) {
      if (!input.cached.startsWith('ghs_')) {
        return { valid: false, reason: 'cached value must be ghs_ token' };
      }
      return { valid: true };
    }

    // validate source credential (json blob)
    if (input.source) {
      const result = parseGithubAppCredentials(input.source);
      if (!result.valid) {
        return { valid: false, reason: `github_app: ${result.reason}` };
      }
      return { valid: true };
    }

    return { valid: false, reason: 'no value to validate' };
  },

  /**
   * .what = translate github app credentials to installation access token
   * .why = generates short-lived token from stored app credentials
   *
   * .note = tokens expire in 1 hour; we set expiresAt to 55 min for clock drift buffer
   */
  translate: async (input) => {
    const result = parseGithubAppCredentials(input.secret);
    if (!result.valid) {
      throw new UnexpectedCodePathError(
        'github_app translate called with invalid credentials',
        { reason: result.reason },
      );
    }

    const { creds } = result;

    // create auth instance
    const auth = createAppAuth({
      appId: creds.appId,
      privateKey: creds.privateKey,
      installationId: Number(creds.installationId),
    });

    // generate installation access token
    const { token } = await auth({ type: 'installation' });

    // github installation tokens expire in 1 hour; buffer 5 min for clock drift
    const expiresAt = addDuration(asIsoTimeStamp(new Date()), { minutes: 55 });

    return { secret: token, expiresAt };
  },
};
