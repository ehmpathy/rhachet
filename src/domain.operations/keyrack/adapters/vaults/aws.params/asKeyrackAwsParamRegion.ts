import { ConstraintError } from 'helpful-errors';

/**
 * .what = pick the region by precedence: AWS_REGION > AWS_DEFAULT_REGION > aws profile default
 * .why = region is NOT ambient (the SDK does not derive it from IMDS); the precedence is pure
 *        logic, extracted so all branches get a fast credential-free unit test. the env sources
 *        win first (a grove/CI carries AWS_REGION); a normal laptop profile that declares a
 *        region in ~/.aws/config is the last resort, so `set` works without an explicit env var.
 *        when even the profile default is absent, fail loud — never guess a region
 */
export const asKeyrackAwsParamRegion = (input: {
  fromEnv: string | null;
  fromEnvDefault: string | null;
  fromProfile: string | null;
}): string =>
  input.fromEnv ??
  input.fromEnvDefault ??
  input.fromProfile ??
  ConstraintError.throw('aws.params requires a region', {
    input,
    hint: 'set AWS_REGION, or add `region = ...` to your aws profile in ~/.aws/config',
  });
