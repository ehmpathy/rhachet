import { ConstraintError } from 'helpful-errors';

import { AWS_STATIC_CREDS_EXPORT_ENV } from './genAwsStaticCredsExport';

/**
 * .what = put the run's aws STATIC creds into process.env for an integration suite, and drop
 *   AWS_PROFILE so the SDK uses them
 * .why = the AWS SDK v3, given an SSO profile, lazily import()s its SSO credential provider,
 *   which jest's default (non-vm-modules) runtime rejects with "A dynamic import callback was
 *   invoked without --experimental-vm-modules". static env creds take the synchronous env
 *   provider instead — a real backend, no mock. this is the same handoff CI performs with a role
 *
 * .note = 🔴 no keyrack source and no aws cli here. `jest.integration.globalSetup.ts` sources
 *   keyrack and exports the static creds ONCE per run (genAwsStaticCredsExport). per suite file,
 *   each was a child process on a loaded box: the python aws cli alone took 14.6s to start
 *   (past this helper's old 10s bound), and the keyrack daemon's peer lookup timed out — 15 of
 *   42 aws.params tests red at load 60 (measured 2026-10-23)
 * .note = call from a beforeAll — it mutates process.env
 */
export const useKeyrack = (): void => {
  // skip in CI — credentials arrive from secrets / an attached role, already in the env
  if (process.env.CI) return;

  // static creds already set: clear the profile so the SDK does not prefer it over them
  if (process.env.AWS_ACCESS_KEY_ID) {
    delete process.env.AWS_PROFILE;
    delete process.env.AWS_DEFAULT_PROFILE;
    return;
  }

  // no profile sourced — a non-aws env; no creds to apply
  if (!process.env.AWS_PROFILE) return;

  // apply the once-per-run export; its absence means globalSetup did not run
  const exported = process.env[AWS_STATIC_CREDS_EXPORT_ENV];
  if (!exported)
    throw new ConstraintError('no aws static creds export for this run', {
      expected: AWS_STATIC_CREDS_EXPORT_ENV,
      hint: 'run via the integration jest config, whose globalSetup exports them: rhx git.repo.test --what integration',
    });
  const vars = JSON.parse(exported) as Record<string, string>;
  Object.entries(vars).forEach(([key, value]) => {
    process.env[key] = value;
  });

  // clear the profile so the SDK uses only the static creds (it prefers a profile otherwise)
  delete process.env.AWS_PROFILE;
  delete process.env.AWS_DEFAULT_PROFILE;
};
