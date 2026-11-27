import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { getOneAwsSsoRoleCredentials } from './getOneAwsSsoRoleCredentials';

/**
 * .what = a fake aws cli that answers every call with one stdout
 */
const genExecAwsCliFake = (input: { stdout: string }) => ({
  execAwsCli: async () => ({ stdout: input.stdout }),
});

describe('getOneAwsSsoRoleCredentials', () => {
  given('[case1] the cli replies with a key pair and an expiry', () => {
    when('[t0] the creds are read', () => {
      then('it returns the creds and the expiry in utc', async () => {
        const result = await getOneAwsSsoRoleCredentials(
          { profileName: 'acme.test' },
          genExecAwsCliFake({
            stdout: [
              'AWS_ACCESS_KEY_ID=MOCKACCESSKEYID00000',
              'AWS_SECRET_ACCESS_KEY=MockSecretAccessKey123456789',
              'AWS_SESSION_TOKEN=MockSessionToken',
              'AWS_CREDENTIAL_EXPIRATION=2026-11-21T18:00:00+00:00',
            ].join('\n'),
          }),
        );
        expect(result.credentials.AWS_ACCESS_KEY_ID).toEqual(
          'MOCKACCESSKEYID00000',
        );
        expect(result.expiresAt).toEqual('2026-11-21T18:00:00Z');
      });
    });
  });

  given('[case2] the cli replies with a key pair and no expiry', () => {
    when('[t0] the creds are read', () => {
      then('it returns the creds with a null expiry', async () => {
        const result = await getOneAwsSsoRoleCredentials(
          { profileName: 'acme.test' },
          genExecAwsCliFake({
            stdout: [
              'AWS_ACCESS_KEY_ID=MOCKACCESSKEYID00000',
              'AWS_SECRET_ACCESS_KEY=MockSecretAccessKey123456789',
            ].join('\n'),
          }),
        );
        expect(result.expiresAt).toEqual(null);
      });
    });
  });

  given('[case3] the cli replies with no key pair', () => {
    when('[t0] the creds are read', () => {
      then(
        'it throws a MalfunctionError that names the keys it saw and a hint',
        async () => {
          const error = await getError(
            getOneAwsSsoRoleCredentials(
              { profileName: 'acme.test' },
              genExecAwsCliFake({
                stdout: 'AWS_SESSION_TOKEN=MockSessionToken\n',
              }),
            ),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain(
            'aws sso export did not return expected credentials',
          );
          expect(error.message).toContain('AWS_SESSION_TOKEN');
          expect(error.message).toContain(
            'aws configure export-credentials --profile acme.test',
          );
        },
      );
    });
  });
});
