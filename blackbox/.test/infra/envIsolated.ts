/**
 * .what = env vars isolated from host AWS configuration
 * .why = prevents host AWS_PROFILE from leak into tests via os.envvar adapter
 */
export const envIsolated = (home: string) => ({
  HOME: home,
  AWS_PROFILE: undefined,
  AWS_ACCESS_KEY_ID: undefined,
  AWS_SECRET_ACCESS_KEY: undefined,
  AWS_SESSION_TOKEN: undefined,
  AWS_REGION: undefined,
  AWS_DEFAULT_REGION: undefined,
});
