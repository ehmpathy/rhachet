import { given, then, when } from 'test-fns';

import { getOneKeyrackAwsParamEndpoint } from './getOneKeyrackAwsParamEndpoint';

/**
 * .what = unit for the ONE SSM-endpoint source + its prod security gate (c44)
 * .why = the override is a REDIRECT of where the SSMClient talks (covers the write that persists a
 *        github-app private key), so the gate that makes it prod-UNREACHABLE is a security control,
 *        not a convenience — one test proves the determinism swap AND the prod-unreachability gate
 */
describe('getOneKeyrackAwsParamEndpoint', () => {
  // save + restore the two env vars the source reads, so no case leaks into another
  const nodeEnvReal = process.env.NODE_ENV;
  const endpointReal = process.env.KEYRACK_AWS_SSM_ENDPOINT;
  const setEnv = (input: {
    nodeEnv: string | undefined;
    endpoint: string | undefined;
  }): void => {
    if (input.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = input.nodeEnv;
    if (input.endpoint === undefined)
      delete process.env.KEYRACK_AWS_SSM_ENDPOINT;
    else process.env.KEYRACK_AWS_SSM_ENDPOINT = input.endpoint;
  };
  afterEach(() => {
    setEnv({ nodeEnv: nodeEnvReal, endpoint: endpointReal });
  });

  given('[case1] a test process (NODE_ENV=test) with the override set', () => {
    when('[t0] resolved', () => {
      then('it returns the emulator url — the determinism swap point', () => {
        setEnv({ nodeEnv: 'test', endpoint: 'http://127.0.0.1:4566' });
        expect(getOneKeyrackAwsParamEndpoint()).toEqual(
          'http://127.0.0.1:4566',
        );
      });
    });
  });

  given('[case2] a test process with NO override set', () => {
    when('[t0] resolved', () => {
      then('it returns null — the SDK resolves the real AWS endpoint', () => {
        setEnv({ nodeEnv: 'test', endpoint: undefined });
        expect(getOneKeyrackAwsParamEndpoint()).toEqual(null);
      });
    });
  });

  given('[case3] a prod process (NODE_ENV!=test) with the override SET', () => {
    when('[t0] resolved — the security gate', () => {
      then(
        'it returns null, so a leaked override cannot redirect a prod SSMClient',
        () => {
          setEnv({
            nodeEnv: 'production',
            endpoint: 'http://evil.example:4566',
          });
          expect(getOneKeyrackAwsParamEndpoint()).toEqual(null);
        },
      );
    });

    when(
      '[t1] NODE_ENV is entirely absent (a bare process) with the override SET',
      () => {
        then(
          'it still returns null — the gate is deny-by-default, not test-by-absence',
          () => {
            setEnv({
              nodeEnv: undefined,
              endpoint: 'http://evil.example:4566',
            });
            expect(getOneKeyrackAwsParamEndpoint()).toEqual(null);
          },
        );
      },
    );
  });
});
