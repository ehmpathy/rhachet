import { MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asGithubAppMintFaultTransient } from './asGithubAppMintFaultTransient';

/**
 * .what = an error shaped as octokit's RequestError: a status, optional headers and cause
 */
const genRequestError = (input: {
  status: number;
  message: string;
  headers: Record<string, string>;
  cause: unknown;
}): Error =>
  Object.assign(new Error(input.message), {
    status: input.status,
    response: { headers: input.headers },
    cause: input.cause,
  });

describe('asGithubAppMintFaultTransient', () => {
  given('[case1] a fetch that never reached github', () => {
    when('[t0] octokit wraps it as a 500 whose cause is the TypeError', () => {
      then('it is a malfunction that names api.github.com', () => {
        const error = genRequestError({
          status: 500,
          message: 'getaddrinfo ENOTFOUND api.github.com',
          headers: {},
          cause: new TypeError('fetch failed'),
        });
        const transient = asGithubAppMintFaultTransient({ error, appId: '1' });
        expect(transient).toBeInstanceOf(MalfunctionError);
        expect(transient?.message).toContain('could not be reached');
        expect(transient?.message).toContain('api.github.com');
      });
    });
  });

  given('[case2] github answered and asked for a retry', () => {
    const cases: {
      label: string;
      status: number;
      headers: Record<string, string>;
    }[] = [
      { label: 'a 502', status: 502, headers: {} },
      { label: 'a 429', status: 429, headers: {} },
      {
        label: 'a rate-limit 403',
        status: 403,
        headers: { 'x-ratelimit-remaining': '0' },
      },
    ];
    cases.forEach((thisCase, index) =>
      when(`[t${index}] ${thisCase.label}`, () => {
        then('it is a malfunction that carries the status', () => {
          const error = genRequestError({
            status: thisCase.status,
            message: 'answered',
            headers: thisCase.headers,
            cause: undefined,
          });
          const transient = asGithubAppMintFaultTransient({
            error,
            appId: '1',
          });
          expect(transient).toBeInstanceOf(MalfunctionError);
          expect(transient?.message).toContain(`(${thisCase.status})`);
        });
      }),
    );
  });

  given('[case3] a fault not known to be transient', () => {
    when('[t0] a TypeError from our own code, with no status', () => {
      then('it is null, so the mech rethrows it untouched', () => {
        const error = new TypeError('minted.token is undefined');
        expect(asGithubAppMintFaultTransient({ error, appId: '1' })).toBeNull();
      });
    });

    when('[t1] a 422 github answered', () => {
      then('it is null, so the network is never blamed for an answer', () => {
        const error = genRequestError({
          status: 422,
          message: 'unprocessable',
          headers: {},
          cause: undefined,
        });
        expect(asGithubAppMintFaultTransient({ error, appId: '1' })).toBeNull();
      });
    });

    when('[t2] a 500 whose cause is no TypeError', () => {
      then('it is a server fault, never "could not be reached"', () => {
        const error = genRequestError({
          status: 500,
          message: 'server',
          headers: {},
          cause: undefined,
        });
        const transient = asGithubAppMintFaultTransient({ error, appId: '1' });
        expect(transient?.message).toContain('could not mint now (500)');
      });
    });
  });
});
