import { fromSSO } from '@aws-sdk/credential-provider-sso';
import { MalfunctionError } from 'helpful-errors';

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { emitSsoGateInvalid } from './emitSsoGateInvalid';

const execAsync = promisify(exec);

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
 * .note = gate 2, `aws configure export-credentials`, pre-warms the cli's role creds
 * .note = `{ live: false }` only for an error that names an ended session; every
 *         other error throws, so a blip is never a lapse
 */
export const getOneAwsSsoSessionProof = async (input: {
  profileName: string;
  onInvalidLevel: 'info' | 'debug';
}): Promise<{ live: boolean }> => {
  const { profileName } = input;
  const level = input.onInvalidLevel;

  // gate 1 — ask the sso servers via the aws sdk
  if (!process.env.AWS_SDK_MOCK) {
    try {
      // .note = ignoreCache forces a fresh read of ~/.aws/config; the @smithy config
      //         loader caches file contents per process, so a profile written earlier
      //         this run would otherwise read as "Profile X not found"
      await fromSSO({ profile: profileName, ignoreCache: true })();
    } catch (error) {
      // CredentialsProviderError = sso expired or revoked remotely
      const isSessionEnded =
        error instanceof Error &&
        (error.name === 'CredentialsProviderError' ||
          error.message.includes('expired') ||
          error.message.includes('invalid'));
      if (isSessionEnded) {
        emitSsoGateInvalid({ gate: 'fromSSO', profileName, error, level });
        return { live: false };
      }
      throw new MalfunctionError(
        'validateSsoTokenWithAwsSdk failed with unexpected error',
        { profileName, error },
      );
    }
  }

  // gate 2 — refresh the cli's role creds from the portal token
  try {
    // .note = unbounded here; the daemon's renew bounds each try (getOneRenewalSettled),
    //         so a wedged cli reads as a counted fault there, never a held slot
    await execAsync(
      `aws configure export-credentials --profile "${profileName}" --format env-no-export`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    const isSessionEnded =
      message.includes('expired') ||
      message.includes('invalid') ||
      message.includes('unauthorized') ||
      message.includes('does not exist') ||
      message.includes('refreshed credentials are still expired');
    if (isSessionEnded) {
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
      { profileName, error },
    );
  }

  return { live: true };
};
