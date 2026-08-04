import { given, then, when } from 'test-fns';

import { getOneKeyrackAwsParam } from './getOneKeyrackAwsParam';

/**
 * .what = unit test for the credsEnv overlay in getOneKeyrackAwsParam (c67)
 *
 * .why = the org-scope identity is selected by a SCOPED process.env.AWS_PROFILE overlay
 *   applied around the one SSM read (declastruct builds its SSMClient with region only, so
 *   the ambient env is the seam that picks the identity). this test proves, WITHOUT any real
 *   AWS, that:
 *     - a profile credsEnv sets AWS_PROFILE for the call, then restores the prior value
 *     - an undefined credsEnv deletes AWS_PROFILE for the call, then restores the prior value
 *   a fake declastruct records the AWS_PROFILE it saw at call time — the overlay is the whole
 *   security-sensitive contract, so it earns a direct unit proof, not only an integration path
 *
 * .scope = internal communicator (NOT a user-faced contract)
 */

// a fake declastruct whose sdkSsm.getOneParameter records the AWS_PROFILE + AWS_ENDPOINT_URL_SSM
// visible at call time (the two overlays getOneKeyrackAwsParam applies around the read)
const genFakeDeclastruct = (record: {
  seen?: string | undefined;
  seenEndpoint?: string | undefined;
}) =>
  ({
    sdkSsm: {
      getOneParameter: async () => {
        record.seen = process.env.AWS_PROFILE;
        record.seenEndpoint = process.env.AWS_ENDPOINT_URL_SSM;
        return { value: 'secret-value', type: 'SecureString' };
      },
    },
    // the read path touches only sdkSsm.getOneParameter; the rest is unused here
  }) as unknown as Parameters<typeof getOneKeyrackAwsParam>[1]['declastruct'];

describe('getOneKeyrackAwsParam credsEnv overlay (c67)', () => {
  given('[case1] a profile credsEnv (a specific-org identity)', () => {
    when('[t0] the read runs with a prior AWS_PROFILE already set', () => {
      then(
        'AWS_PROFILE is the org profile for the call, restored after',
        async () => {
          const priorAwsProfile = process.env.AWS_PROFILE;
          process.env.AWS_PROFILE = 'prior-profile';
          const record: { seen?: string | undefined } = {};
          try {
            const result = await getOneKeyrackAwsParam(
              {
                exid: '/keyrack/anthropic',
                region: 'us-east-1',
                credsEnv: { AWS_PROFILE: 'ehmpathy-prod' },
                endpoint: null,
              },
              { declastruct: genFakeDeclastruct(record) },
            );
            expect(result).toEqual({
              value: 'secret-value',
              type: 'SecureString',
            });
            // the org profile was active for the ssm read
            expect(record.seen).toEqual('ehmpathy-prod');
            // the prior value is restored after the read (no leak past this call)
            expect(process.env.AWS_PROFILE).toEqual('prior-profile');
          } finally {
            if (priorAwsProfile === undefined) delete process.env.AWS_PROFILE;
            else process.env.AWS_PROFILE = priorAwsProfile;
          }
        },
      );
    });
  });

  given(
    '[case2] an imds credsEnv (AWS_PROFILE undefined, the grove IMDS role)',
    () => {
      when('[t0] the read runs with a prior AWS_PROFILE already set', () => {
        then(
          'AWS_PROFILE is cleared for the call, restored after',
          async () => {
            const priorAwsProfile = process.env.AWS_PROFILE;
            process.env.AWS_PROFILE = 'prior-profile';
            const record: { seen?: string | undefined } = {};
            try {
              await getOneKeyrackAwsParam(
                {
                  exid: '/keyrack/anthropic',
                  region: 'us-east-1',
                  credsEnv: { AWS_PROFILE: undefined },
                  endpoint: null,
                },
                { declastruct: genFakeDeclastruct(record) },
              );
              // AWS_PROFILE was CLEARED for the read, so the SDK default chain derives IMDS
              expect(record.seen).toBeUndefined();
              // the prior value is restored after the read
              expect(process.env.AWS_PROFILE).toEqual('prior-profile');
            } finally {
              if (priorAwsProfile === undefined) delete process.env.AWS_PROFILE;
              else process.env.AWS_PROFILE = priorAwsProfile;
            }
          },
        );
      });
    },
  );

  given('[case3] an endpoint overlay (the emulator-swap read half)', () => {
    when(
      '[t0] the read runs with a prior AWS_ENDPOINT_URL_SSM already set',
      () => {
        then(
          'AWS_ENDPOINT_URL_SSM is the emulator url for the call, restored after',
          async () => {
            const priorEndpoint = process.env.AWS_ENDPOINT_URL_SSM;
            process.env.AWS_ENDPOINT_URL_SSM = 'http://prior-endpoint';
            const record: { seenEndpoint?: string | undefined } = {};
            try {
              await getOneKeyrackAwsParam(
                {
                  exid: '/keyrack/anthropic',
                  region: 'us-east-1',
                  credsEnv: { AWS_PROFILE: undefined },
                  endpoint: 'http://127.0.0.1:4566',
                },
                { declastruct: genFakeDeclastruct(record) },
              );
              // the emulator endpoint was active for the ssm read
              expect(record.seenEndpoint).toEqual('http://127.0.0.1:4566');
              // the prior value is restored after the read (no leak past this call)
              expect(process.env.AWS_ENDPOINT_URL_SSM).toEqual(
                'http://prior-endpoint',
              );
            } finally {
              if (priorEndpoint === undefined)
                delete process.env.AWS_ENDPOINT_URL_SSM;
              else process.env.AWS_ENDPOINT_URL_SSM = priorEndpoint;
            }
          },
        );
      },
    );

    when('[t1] a null endpoint with a prior AWS_ENDPOINT_URL_SSM set', () => {
      then(
        'AWS_ENDPOINT_URL_SSM is cleared for the call, restored after',
        async () => {
          const priorEndpoint = process.env.AWS_ENDPOINT_URL_SSM;
          process.env.AWS_ENDPOINT_URL_SSM = 'http://prior-endpoint';
          const record: { seenEndpoint?: string | undefined } = {};
          try {
            await getOneKeyrackAwsParam(
              {
                exid: '/keyrack/anthropic',
                region: 'us-east-1',
                credsEnv: { AWS_PROFILE: undefined },
                endpoint: null,
              },
              { declastruct: genFakeDeclastruct(record) },
            );
            // a null endpoint CLEARS the override for the read, so the SDK derives real AWS
            expect(record.seenEndpoint).toBeUndefined();
            // the prior value is restored after the read
            expect(process.env.AWS_ENDPOINT_URL_SSM).toEqual(
              'http://prior-endpoint',
            );
          } finally {
            if (priorEndpoint === undefined)
              delete process.env.AWS_ENDPOINT_URL_SSM;
            else process.env.AWS_ENDPOINT_URL_SSM = priorEndpoint;
          }
        },
      );
    });
  });
});
