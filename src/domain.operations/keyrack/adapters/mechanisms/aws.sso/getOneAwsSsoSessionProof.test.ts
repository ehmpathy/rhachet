import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { getOneAwsSsoSessionProof } from './getOneAwsSsoSessionProof';

/**
 * .what = role creds as a live export returns them
 */
const ROLE_CREDENTIALS = {
  credentials: {
    AWS_ACCESS_KEY_ID: 'MOCKACCESSKEYID00000',
    AWS_SECRET_ACCESS_KEY: 'MockSecretAccessKey123456789',
  },
  expiresAt: null,
};

/**
 * .what = an exec error as node's execFile rejects it: the argv in the message, the
 *         child's output on `stderr`
 */
const genExecError = (input: { stderr: string }): Error =>
  Object.assign(
    new Error(
      'Command failed: aws configure export-credentials --profile acme.test',
    ),
    { stderr: input.stderr },
  );

/**
 * .what = an Error with a given name
 */
const genNamedError = (input: { name: string; message: string }): Error =>
  Object.assign(new Error(input.message), { name: input.name });

const INPUT = { profileName: 'acme.test', onInvalidLevel: 'debug' as const };

describe('getOneAwsSsoSessionProof', () => {
  given('[case1] both gates pass', () => {
    when('[t0] the proof runs', () => {
      then('it is live, with the role creds the export read', async () => {
        const result = await getOneAwsSsoSessionProof(INPUT, {
          proveViaSdk: async () => {},
          getRoleCredentials: async () => ROLE_CREDENTIALS,
        });
        expect(result).toEqual({
          live: true,
          roleCredentials: ROLE_CREDENTIALS,
        });
      });
    });
  });

  given('[case2] the sdk gate says the session ended', () => {
    when('[t0] the proof runs', () => {
      then('it is not live, and the export is never asked', async () => {
        const result = await getOneAwsSsoSessionProof(INPUT, {
          proveViaSdk: async () => {
            throw genNamedError({
              name: 'TokenProviderError',
              message:
                "Token is expired. To refresh this SSO session run 'aws sso login' with the corresponding profile.",
            });
          },
          getRoleCredentials: async () => {
            throw new Error('the export must not run after a lapse');
          },
        });
        expect(result).toEqual({ live: false });
      });
    });
  });

  given('[case3] the sdk gate fails on aught but a session end', () => {
    when('[t0] the proof runs', () => {
      then('it throws a MalfunctionError, never a lapse', async () => {
        const error = await getError(
          getOneAwsSsoSessionProof(INPUT, {
            proveViaSdk: async () => {
              throw genNamedError({
                name: 'CredentialsProviderError',
                message:
                  'getaddrinfo ENOTFOUND portal.sso.us-east-1.amazonaws.com',
              });
            },
            getRoleCredentials: async () => ROLE_CREDENTIALS,
          }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain(
          'aws sso session check (sdk fromSSO) failed with unexpected error',
        );
      });
    });
  });

  given(
    '[case4] the sdk gate is skipped and the export says the session ended',
    () => {
      when('[t0] the proof runs', () => {
        then('it is not live', async () => {
          const result = await getOneAwsSsoSessionProof(INPUT, {
            proveViaSdk: null,
            getRoleCredentials: async () => {
              throw genExecError({
                stderr:
                  'Error from sso: Token has expired and refresh failed\n',
              });
            },
          });
          expect(result).toEqual({ live: false });
        });
      });
    },
  );

  given('[case5] the export fails on aught but a session end', () => {
    when('[t0] the proof runs', () => {
      then('it throws a MalfunctionError, never a lapse', async () => {
        const error = await getError(
          getOneAwsSsoSessionProof(INPUT, {
            proveViaSdk: null,
            getRoleCredentials: async () => {
              throw genExecError({ stderr: 'connection reset by peer\n' });
            },
          }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain(
          'aws configure export-credentials failed with unexpected error',
        );
      });
    });
  });

  given('[case6] the export replies with no creds', () => {
    when('[t0] the proof runs', () => {
      then('the classed fault passes through as thrown', async () => {
        const fault = new MalfunctionError(
          'aws sso export did not return expected credentials',
        );
        const error = await getError(
          getOneAwsSsoSessionProof(INPUT, {
            proveViaSdk: null,
            getRoleCredentials: async () => {
              throw fault;
            },
          }),
        );
        expect(error).toBe(fault);
      });
    });
  });
});
