import { execSync } from 'node:child_process';

/**
 * .what = the env var that carries the once-per-run aws static creds export to every suite
 * .why = `globalSetup` writes it before jest forks its workers, and a forked worker inherits
 *   the env, so each suite reads the export rather than spawns the aws cli itself
 */
export const AWS_STATIC_CREDS_EXPORT_ENV = 'RHACHET_TEST_AWS_STATIC_CREDS_EXPORT';

/**
 * .what = the hang guard on the one export call, in ms
 * .why = the aws cli is a python program, and its startup alone (`aws --version`) measured
 *   14.6s on a dev box at load 60 over 12 cpus (2026-10-23, `rhx aws.export.probe`). a 10s
 *   bound per suite file failed six to fifteen suites per run. paid once per run, the bound
 *   only has to catch a true hang
 */
const AWS_EXPORT_HANG_GUARD_MS = 120_000;

/**
 * .what = export STATIC aws creds for the sourced profile, once per run, into
 *   `AWS_STATIC_CREDS_EXPORT_ENV` as json
 * .why = the AWS SDK v3, given an SSO profile, lazily import()s its SSO provider, which jest's
 *   runtime rejects ("A dynamic import callback was invoked without --experimental-vm-modules").
 *   static env creds avoid that provider. the export runs here once, never per suite
 *
 * .note = a no-op in CI (creds arrive as env already), when static creds are already set, or
 *   when no profile was sourced. AWS_PROFILE is left as is: only `useKeyrack` callers swap the
 *   profile for the static creds, so every other suite keeps the env it had before
 */
export const genAwsStaticCredsExport = (): void => {
  // creds arrive from secrets or an attached role in CI; static creds need no export
  if (process.env.CI) return;
  if (process.env.AWS_ACCESS_KEY_ID) return;
  const profile = process.env.AWS_PROFILE;
  if (!profile) return;

  // export the live profile's static creds once
  const exported = execSync(
    `aws configure export-credentials --profile "${profile}" --format env`,
    { encoding: 'utf8', timeout: AWS_EXPORT_HANG_GUARD_MS }, // eslint-disable-line @cspell/spellchecker -- node api
  );
  const vars = Object.fromEntries(
    exported
      .split('\n')
      .map((line) => line.match(/^export\s+(\w+)=(.*)$/))
      .filter((match): match is RegExpMatchArray => !!match?.[1])
      .map((match) => [match[1]!, match[2] ?? '']),
  );
  process.env[AWS_STATIC_CREDS_EXPORT_ENV] = JSON.stringify(vars);
};
