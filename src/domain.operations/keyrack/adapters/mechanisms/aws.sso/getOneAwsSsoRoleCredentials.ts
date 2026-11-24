import { MalfunctionError } from 'helpful-errors';
import type { IsoTimeStamp } from 'iso-time';

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { asAwsCredentialsFromEnvLines } from './asAwsCredentialsFromEnvLines';
import { asIsoTimeStampFromAwsExpiration } from './asIsoTimeStampFromAwsExpiration';

const execFileAsync = promisify(execFile);

/**
 * .what = how long one `aws configure export-credentials` may run
 * .why = a wedged cli must end, not just be abandoned: the daemon's renew bound
 *        (`getOneRenewalSettled`) stops the wait, and this stops the child, so at most one
 *        cli runs per key at a time
 */
const AWS_EXPORT_TIMEOUT_MS = 60 * 1000;

/**
 * .what = run the aws cli by argv, bounded
 * .why = the one call that crosses the process boundary, injected so the reply's
 *        classification is unit-testable with a fake
 */
const execAwsCliDefault = (input: {
  args: string[];
  timeoutMs: number;
}): Promise<{ stdout: string }> =>
  execFileAsync('aws', input.args, { timeout: input.timeoutMs });

/**
 * .what = read an sso profile's role credentials from the aws cli
 * .why = one read serves both callers: `get` needs the creds, and the renew needs the
 *        creds' own expiry. the expiry is null when the cli names none, so each caller
 *        decides — `get` may guess, a renew must not
 *
 * .note = argv, never a shell string: the profile name reaches the daemon over its socket,
 *         so it is never interpolated into a command line
 * .note = a cli failure throws as raised, so a caller can classify it (a session end
 *         versus a fault); a reply with no creds is a MalfunctionError
 */
export const getOneAwsSsoRoleCredentials = async (
  input: {
    profileName: string;
  },
  context: {
    execAwsCli: typeof execAwsCliDefault;
  } = { execAwsCli: execAwsCliDefault },
): Promise<{
  credentials: Record<string, string>;
  expiresAt: IsoTimeStamp | null;
}> => {
  // export the role creds as KEY=value lines
  const { stdout } = await context.execAwsCli({
    args: [
      'configure',
      'export-credentials',
      '--profile',
      input.profileName,
      '--format',
      'env-no-export',
    ],
    timeoutMs: AWS_EXPORT_TIMEOUT_MS,
  });

  // read the KEY=value lines
  const credentials = asAwsCredentialsFromEnvLines({ stdout });

  // a reply with no key pair is no credential at all
  if (!credentials.AWS_ACCESS_KEY_ID || !credentials.AWS_SECRET_ACCESS_KEY)
    throw new MalfunctionError(
      'aws sso export did not return expected credentials',
      {
        profileName: input.profileName,
        keys: Object.keys(credentials),
        hint: `the aws cli replied with no key pair; check its version (aws --version, v2 required), then run: aws configure export-credentials --profile ${input.profileName}`,
      },
    );

  // the creds' own expiry, as the cli reports it
  const expiresAt = asIsoTimeStampFromAwsExpiration({
    raw: credentials.AWS_CREDENTIAL_EXPIRATION ?? null,
  });

  return { credentials, expiresAt };
};
