import { given, then, when } from 'test-fns';

import { asKeyrackAwsParamRegion } from './asKeyrackAwsParamRegion';

describe('asKeyrackAwsParamRegion', () => {
  given('[case1] AWS_REGION present', () => {
    when('[t0] all sources set', () => {
      then('env wins over env-default and profile', () => {
        expect(
          asKeyrackAwsParamRegion({
            fromEnv: 'us-west-2',
            fromEnvDefault: 'eu-west-1',
            fromProfile: 'ap-south-1',
          }),
        ).toEqual('us-west-2');
      });
    });
  });

  given('[case2] only AWS_DEFAULT_REGION and profile present', () => {
    when('[t0] resolved', () => {
      then('env-default wins over profile', () => {
        expect(
          asKeyrackAwsParamRegion({
            fromEnv: null,
            fromEnvDefault: 'eu-west-1',
            fromProfile: 'ap-south-1',
          }),
        ).toEqual('eu-west-1');
      });
    });
  });

  given('[case3] only the profile region present', () => {
    when('[t0] resolved', () => {
      then(
        'the profile default wins (set works without an explicit env var)',
        () => {
          expect(
            asKeyrackAwsParamRegion({
              fromEnv: null,
              fromEnvDefault: null,
              fromProfile: 'ap-south-1',
            }),
          ).toEqual('ap-south-1');
        },
      );
    });
  });

  given(
    '[case4] no source anywhere (env, env-default, and profile all absent)',
    () => {
      when('[t0] resolved', () => {
        then('it fails loud and names the fix — never guesses a region', () => {
          expect(() =>
            asKeyrackAwsParamRegion({
              fromEnv: null,
              fromEnvDefault: null,
              fromProfile: null,
            }),
          ).toThrow('aws.params requires a region');
        });
      });
    },
  );
});
