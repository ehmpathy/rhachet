import { runInNewContext } from 'node:vm';
import { isAwsSsoSessionEndedError } from './isAwsSsoSessionEndedError';

/**
 * .what = an Error with a given name
 */
const genNamedError = (input: { name: string; message: string }): Error =>
  Object.assign(new Error(input.message), { name: input.name });

/**
 * .what = an exec error as node's execFile rejects it: the argv in the message, the
 *         child's output on `stderr`
 */
const genExecError = (input: { message: string; stderr: string }): Error =>
  Object.assign(new Error(input.message), { stderr: input.stderr });

/**
 * .what = an exec error built in a second realm, so it is no instance of this realm's Error
 * .why = node builds an exec error in its own realm; under a jest sandbox that realm differs
 *        from the test's, which is the shape the real cli gate meets there
 */
const genExecErrorForeign = (input: {
  message: string;
  stderr: string;
}): unknown =>
  runInNewContext(
    'Object.assign(new Error(message), { stderr: stderr })',
    input,
  );

/**
 * .what = the sentence the real aws cli v2 writes when the portal holds no token
 */
const CLI_STDERR_TOKEN_ABSENT =
  '\naws: [ERROR]: Error loading SSO Token: Token for rhachet-proof-portal does not exist\n';

const TEST_CASES = [
  {
    description:
      'sdk gate: the sdk sentence for an expired session is a session end',
    given: {
      gate: 'fromSSO' as const,
      error: genNamedError({
        name: 'CredentialsProviderError',
        message:
          'The SSO session associated with this profile has expired. To refresh this SSO session run aws sso login.',
      }),
    },
    expect: { output: true },
  },
  // .note = the three sentences below are verbatim from `@aws-sdk/token-providers`
  //         (`fromSso`), which an `sso_session` profile reaches; each ends in its refresh hint
  {
    description:
      'sdk gate: sso_session profile, an expired portal token is a session end',
    given: {
      gate: 'fromSSO' as const,
      error: genNamedError({
        name: 'TokenProviderError',
        message:
          "Token is expired. To refresh this SSO session run 'aws sso login' with the corresponding profile.",
      }),
    },
    expect: { output: true },
  },
  {
    description:
      'sdk gate: sso_session profile, an absent token cache is a session end',
    given: {
      gate: 'fromSSO' as const,
      error: genNamedError({
        name: 'TokenProviderError',
        message:
          "The SSO session token associated with profile=ahbode.camp was not found or is invalid. To refresh this SSO session run 'aws sso login' with the corresponding profile.",
      }),
    },
    expect: { output: true },
  },
  {
    description:
      'sdk gate: sso_session profile, a token with no refresh token is a session end',
    given: {
      gate: 'fromSSO' as const,
      error: genNamedError({
        name: 'TokenProviderError',
        message:
          "Value not present for 'refreshToken' in SSO Token. Cannot refresh. To refresh this SSO session run 'aws sso login' with the corresponding profile.",
      }),
    },
    expect: { output: true },
  },
  {
    description:
      'sdk gate: sso_session profile, an sso-session absent from config is not a session end',
    given: {
      gate: 'fromSSO' as const,
      error: genNamedError({
        name: 'TokenProviderError',
        message:
          "Sso session 'mock-portal' could not be found in shared credentials file.",
      }),
    },
    expect: { output: false },
  },
  {
    description: 'sdk gate: a revoked token is a session end',
    given: {
      gate: 'fromSSO' as const,
      error: genNamedError({
        name: 'UnauthorizedException',
        message: 'Session token not found or invalid',
      }),
    },
    expect: { output: true },
  },
  {
    description:
      'sdk gate: a network blip wrapped in CredentialsProviderError is not a session end',
    given: {
      gate: 'fromSSO' as const,
      error: genNamedError({
        name: 'CredentialsProviderError',
        message: 'getaddrinfo ENOTFOUND portal.sso.us-east-1.amazonaws.com',
      }),
    },
    expect: { output: false },
  },
  {
    description: 'sdk gate: a config fault named invalid is not a session end',
    given: {
      gate: 'fromSSO' as const,
      error: genNamedError({
        name: 'CredentialsProviderError',
        message:
          'Profile ahbode.camp is configured with invalid SSO credentials.',
      }),
    },
    expect: { output: false },
  },
  {
    description: 'cli gate: an expired token on stderr is a session end',
    given: {
      gate: 'export-credentials' as const,
      error: genExecError({
        message:
          'Command failed: aws configure export-credentials --profile ahbode.camp',
        stderr: 'Error from sso: Token has expired and refresh failed\n',
      }),
    },
    expect: { output: true },
  },
  {
    description: 'cli gate: a token that does not exist is a session end',
    given: {
      gate: 'export-credentials' as const,
      error: genExecError({
        message:
          'Command failed: aws configure export-credentials --profile ahbode.camp',
        stderr: 'Error: the SSO Token for ahbode does not exist\n',
      }),
    },
    expect: { output: true },
  },
  {
    description:
      'cli gate: a profile named like a lapse does not make a blip a session end',
    given: {
      gate: 'export-credentials' as const,
      error: genExecError({
        message:
          'Command failed: aws configure export-credentials --profile acme.expired-test',
        stderr: 'connection reset by peer\n',
      }),
    },
    expect: { output: false },
  },
  {
    description: 'cli gate: CredentialsProviderError by name alone is not read',
    given: {
      gate: 'export-credentials' as const,
      error: genNamedError({
        name: 'CredentialsProviderError',
        message: 'command timed out',
      }),
    },
    expect: { output: false },
  },
  {
    description:
      'cli gate: the real cli v2 sentence for an absent portal token is a session end',
    given: {
      gate: 'export-credentials' as const,
      error: genExecError({
        message:
          'Command failed: aws configure export-credentials --profile rhachet-proof-test',
        stderr: CLI_STDERR_TOKEN_ABSENT,
      }),
    },
    expect: { output: true },
  },
  {
    description:
      'cli gate: an exec error from a second realm is still read by its stderr',
    given: {
      gate: 'export-credentials' as const,
      error: genExecErrorForeign({
        message:
          'Command failed: aws configure export-credentials --profile rhachet-proof-test',
        stderr: CLI_STDERR_TOKEN_ABSENT,
      }),
    },
    expect: { output: true },
  },
  {
    description: 'any gate: an object whose message is no string is not read',
    given: {
      gate: 'export-credentials' as const,
      error: { message: 42, stderr: CLI_STDERR_TOKEN_ABSENT },
    },
    expect: { output: false },
  },
  {
    description: 'any gate: a thrown non-Error is not a session end',
    given: { gate: 'fromSSO' as const, error: 'boom' },
    expect: { output: false },
  },
];

describe('isAwsSsoSessionEndedError', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isAwsSsoSessionEndedError(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
