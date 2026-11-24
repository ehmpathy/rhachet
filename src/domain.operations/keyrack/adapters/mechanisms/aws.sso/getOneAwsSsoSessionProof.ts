import { fromSSO } from '@aws-sdk/credential-provider-sso';
import { MalfunctionError } from 'helpful-errors';

import { emitSsoGateInvalid } from './emitSsoGateInvalid';
import { getOneAwsSsoRoleCredentials } from './getOneAwsSsoRoleCredentials';
import { isAwsSsoSessionEndedError } from './isAwsSsoSessionEndedError';

/**
 * .what = gate 1's call: ask the sso servers via the aws sdk
 * .note = ignoreCache forces a fresh read of ~/.aws/config; the @smithy config loader
 *         caches file contents per process, so a profile written earlier this run would
 *         otherwise read as "Profile X not found"
 */
const proveViaSdkDefault = async (input: {
  profileName: string;
}): Promise<void> => {
  await fromSSO({ profile: input.profileName, ignoreCache: true })();
};

/**
 * .what = the two gate calls, as the proof runs them outside a test
 * .why = each gate crosses a process or network boundary; injected, the proof's
 *        lapse-or-fault decision is unit-testable with fakes
 * .note = gate 1 is null when AWS_SDK_MOCK=1, since a mock cli cannot intercept the sdk
 */
const genProofContextDefault = (): {
  proveViaSdk: typeof proveViaSdkDefault | null;
  getRoleCredentials: typeof getOneAwsSsoRoleCredentials;
} => ({
  proveViaSdk: process.env.AWS_SDK_MOCK ? null : proveViaSdkDefault,
  getRoleCredentials: getOneAwsSsoRoleCredentials,
});

/**
 * .what = prove an sso portal session is live, silently — never a browser
 * .why = the two gates that decide "is the portal session live" without the
 *        identity read. a renew needs exactly this answer: the identity read (sts)
 *        reads any non-zero exit as invalid, so a network blip there would read as a
 *        lapse. here, an unknown error is a MalfunctionError, which a caller retries
 *
 * .note = gate 1, the aws sdk's fromSSO, asks the sso servers — the cache can lie
 *         (https://github.com/aws/aws-cli/issues/9845). skipped when AWS_SDK_MOCK=1,
 *         since a mock cli cannot intercept the sdk
 * .note = gate 2, `aws configure export-credentials`, pre-warms the cli's role creds,
 *         and a live proof carries what it read, so a renew needs no second export
 * .note = `{ live: false }` only for an error that names an ended session; every
 *         other error throws, so a blip is never a lapse
 */
export const getOneAwsSsoSessionProof = async (
  input: {
    profileName: string;
    onInvalidLevel: 'info' | 'debug';
  },
  context: ReturnType<typeof genProofContextDefault> = genProofContextDefault(),
): Promise<
  | { live: false }
  | {
      live: true;
      roleCredentials: Awaited<ReturnType<typeof getOneAwsSsoRoleCredentials>>;
    }
> => {
  const { profileName } = input;
  const level = input.onInvalidLevel;

  // gate 1 — ask the sso servers via the aws sdk
  if (context.proveViaSdk) {
    try {
      await context.proveViaSdk({ profileName });
    } catch (error) {
      // a session end is a lapse; any other error is a fault the caller retries
      if (isAwsSsoSessionEndedError({ gate: 'fromSSO', error })) {
        emitSsoGateInvalid({ gate: 'fromSSO', profileName, error, level });
        return { live: false };
      }
      throw new MalfunctionError(
        'aws sso session check (sdk fromSSO) failed with unexpected error',
        {
          profileName,
          hint: `read the cause below; a network or throttle error clears on retry, a config error needs a fix to the profile in ~/.aws/config. to see it outside keyrack: aws sts get-caller-identity --profile ${profileName}`,
          error,
          ...(error instanceof Error ? { cause: error } : {}),
        },
      );
    }
  }

  // gate 2 — refresh the cli's role creds from the portal token
  try {
    // .note = the read is bounded and ends its child (getOneAwsSsoRoleCredentials), so a
    //         wedged cli reads as a counted fault, never a held slot
    const roleCredentials = await context.getRoleCredentials({ profileName });
    return { live: true, roleCredentials };
  } catch (error) {
    // a reply with no creds is already a classed fault; pass it through
    if (error instanceof MalfunctionError) throw error;

    // a session end is a lapse; any other error is a fault the caller retries
    if (isAwsSsoSessionEndedError({ gate: 'export-credentials', error })) {
      emitSsoGateInvalid({
        gate: 'export-credentials',
        profileName,
        error,
        level,
      });
      return { live: false };
    }
    throw new MalfunctionError(
      'aws configure export-credentials failed with unexpected error',
      {
        profileName,
        hint: `read the cli stderr in the cause below; to see it outside keyrack: aws configure export-credentials --profile ${profileName}`,
        error,
        ...(error instanceof Error ? { cause: error } : {}),
      },
    );
  }
};
