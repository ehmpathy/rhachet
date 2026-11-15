import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asGithubAppMintFaultRefusal } from './asGithubAppMintFaultRefusal';

/**
 * .what = an error shaped like the @octokit RequestError github returns for a refused key
 */
const genErrorWithStatus = (input: { status: number }): Error =>
  Object.assign(new Error('A JSON web token could not be decoded'), {
    status: input.status,
  });

describe('asGithubAppMintFaultRefusal', () => {
  given('[case1] github refuses the key (401)', () => {
    when('[t0] mapped', () => {
      const refusal = asGithubAppMintFaultRefusal({
        error: genErrorWithStatus({ status: 401 }),
        appId: '123456',
      });

      then('it is a ConstraintError that names the stale blob', () => {
        expect(refusal).toBeInstanceOf(ConstraintError);
        expect(refusal?.message).toContain(
          'github refused the stored private key (401)',
        );
      });

      then(
        'it states the fault and names no vault, so each vault adds its cure',
        () => {
          expect(refusal?.message).toContain('re-file the current blob');
          expect(refusal?.message).toContain('"fault": "key-refused"');
          expect(refusal?.message).not.toContain('os.secure');
          expect(refusal?.message).not.toContain('aws.params');
        },
      );

      then('the refusal a human reads matches snapshot', () => {
        expect(refusal?.message).toMatchSnapshot();
      });
    });
  });

  given('[case2] the pem is not an rsa key', () => {
    when('[t0] mapped, with the root reason on the cause', () => {
      const refusal = asGithubAppMintFaultRefusal({
        error: Object.assign(new Error('mint failed'), {
          cause: new Error('error:1E08010C:DECODER routines::unsupported'),
        }),
        appId: '123456',
      });

      then('it is a ConstraintError that names the bad pem', () => {
        expect(refusal).toBeInstanceOf(ConstraintError);
        expect(refusal?.message).toContain('not a valid rsa key');
      });
    });
  });

  given('[case4] github refuses the installation (404 or 403)', () => {
    when('[t0] a 404', () => {
      const refusal = asGithubAppMintFaultRefusal({
        error: genErrorWithStatus({ status: 404 }),
        appId: '123456',
      });

      then('it is a ConstraintError that names the installation', () => {
        expect(refusal).toBeInstanceOf(ConstraintError);
        expect(refusal?.message).toContain(
          'github refused the stored installation (404)',
        );
        expect(refusal?.message).toContain('"fault": "installation-refused"');
        expect(refusal?.message).not.toContain('os.secure');
      });

      then('the refusal a human reads matches snapshot', () => {
        expect(refusal?.message).toMatchSnapshot();
      });
    });

    when('[t1] a 403', () => {
      then('it is the same refusal, with its own status', () => {
        const refusal = asGithubAppMintFaultRefusal({
          error: genErrorWithStatus({ status: 403 }),
          appId: '123456',
        });
        expect(refusal).toBeInstanceOf(ConstraintError);
        expect(refusal?.message).toContain(
          'github refused the stored installation (403)',
        );
      });
    });
  });

  given('[case5] github throttles the mint (403 rate limit)', () => {
    when('[t0] a primary limit, marked by its header', () => {
      then('it maps to null, never "installation refused"', () => {
        const error = Object.assign(new Error('Forbidden'), {
          status: 403,
          response: { headers: { 'x-ratelimit-remaining': '0' } },
        });
        expect(
          asGithubAppMintFaultRefusal({ error, appId: '123456' }),
        ).toBeNull();
      });
    });

    when('[t1] a secondary limit, marked by retry-after', () => {
      then('it maps to null', () => {
        const error = Object.assign(new Error('Forbidden'), {
          status: 403,
          response: { headers: { 'retry-after': '60' } },
        });
        expect(
          asGithubAppMintFaultRefusal({ error, appId: '123456' }),
        ).toBeNull();
      });
    });

    when('[t2] a limit named only in the message', () => {
      then('it maps to null', () => {
        const error = Object.assign(
          new Error('You have exceeded a secondary rate limit'),
          { status: 403 },
        );
        expect(
          asGithubAppMintFaultRefusal({ error, appId: '123456' }),
        ).toBeNull();
      });
    });
  });

  given('[case3] a fault the blob did not cause', () => {
    when('[t0] a 5xx from github', () => {
      then('it maps to null, so the caller re-throws it untouched', () => {
        expect(
          asGithubAppMintFaultRefusal({
            error: genErrorWithStatus({ status: 502 }),
            appId: '123456',
          }),
        ).toBeNull();
      });
    });

    when(
      '[t2] a fault that merely says "unsupported" or names a .pem path',
      () => {
        then('it maps to null, never to the bad-key cure', () => {
          expect(
            asGithubAppMintFaultRefusal({
              error: new Error(
                'unsupported api version for /home/x/.keys/app.pem request',
              ),
              appId: '123456',
            }),
          ).toBeNull();
        });
      },
    );

    when('[t1] a network fault', () => {
      then('it maps to null', () => {
        expect(
          asGithubAppMintFaultRefusal({
            error: new Error('getaddrinfo ENOTFOUND api.github.com'),
            appId: '123456',
          }),
        ).toBeNull();
      });
    });
  });
});
