import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { addDuration, asIsoTimeStamp } from 'iso-time';

import type { KeyrackGrantMechanismAdapter } from '@src/domain.objects/keyrack';
import { assertKeyrackReachAbsent } from '@src/domain.operations/keyrack/reach/assertKeyrackReachAbsent';

import { execSync } from 'node:child_process';
import { getOneAwsSsoRoleCredentials } from './getOneAwsSsoRoleCredentials';
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
   * .note = uses AWS_CREDENTIAL_EXPIRATION if available, else 55 min buffer
   */
  deliverForGet: async (input) => {
    const profile = input.source;

    try {
      // read the role creds and their own expiry from the cli
      const { credentials, expiresAt: expiresAtReported } =
        await getOneAwsSsoRoleCredentials({ profileName: profile });

      // the cli's expiry when it names one, else 55 min from now
      const expiresAt =
        expiresAtReported ??
        addDuration(asIsoTimeStamp(new Date()), { minutes: 55 });

      return { secret: JSON.stringify(credentials), expiresAt };
    } catch (error) {
      if (error instanceof MalfunctionError) throw error;

      throw new MalfunctionError('aws sso credential refresh failed', {
        profile,
        error,
      });
    }
  },

  /**
   * .what = renew an sso grant from the live portal session, silently
   * .why = the role creds behind an sso grant end long before the portal session
   *        behind them. the silent proof re-derives the role creds with no browser;
   *        a lapsed portal answers `lapsed` at once
   *
   * .note = never reaches `aws sso login`. the browser path is unreachable from here by
   *         construction, so a lapsed portal can never hang the host on a prompt
   * .note = an sso grant's secret is its profile name: aws.config holds a reference,
   *         never creds, and its get hands the profile name on as the secret. this mech
   *         reads it there; the host never assumes a secret is a source
   * .note = the proof import is lazy: a host that renews no sso grant never loads the
   *         aws sdk (rule.require.thinnest-import-path)
   * .note = an unknown error throws (a MalfunctionError from the proof or the export);
   *         the host counts it as a fault, never as a lapse
   */
  renewForDaemon: async (input) => {
    const profileName = input.grant.key.secret;

    // refuse a source that is no profile name, before it reaches the aws cli's argv
    // .note = a counted fault, so a grant that somehow holds one halts at the fault window
    if (!isValidProfileName(profileName))
      throw new ConstraintError('aws sso renew source is not a profile name', {
        hint: 'the grant holds no aws profile name; unlock the key again from its aws.config vault',
      });

    // prove the portal session live, with no browser
    const { getOneAwsSsoSessionProof } = await import(
      './getOneAwsSsoSessionProof'
    );
    const proof = await getOneAwsSsoSessionProof({
      profileName,
      onInvalidLevel: 'debug',
    });
    if (!proof.live) return { status: 'lapsed' };

    // the role creds' own expiry, from the read the proof already made
    // .why = a guessed expiry would renew a key the cli never vouched for; fail loud
    //        instead, so the gap is a counted fault that names itself
    const { expiresAt } = proof.roleCredentials;
    if (!expiresAt)
      throw new MalfunctionError('aws sso renew returned no expiry', {
        profileName,
        hint: 'the aws cli named no AWS_CREDENTIAL_EXPIRATION; upgrade the aws cli to v2',
      });

    return { status: 'renewed', expiresAt };
  },
};
