import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { keyrack } from '@src/contract/sdk.keyrack';

/**
 * .what = source aws credentials from keyrack into process.env for an integration test
 * .why = the AWS SDK v3, given an SSO profile, lazily import()s its SSO credential provider,
 *        which jest's default (non-vm-modules) runtime rejects with
 *        "A dynamic import callback was invoked without --experimental-vm-modules". so this
 *        sources the profile THROUGH keyrack (keyrack.source refreshes the SSO session on
 *        demand via the aws.config vault), then exports STATIC keys for that live profile and
 *        drops AWS_PROFILE — so the SDK uses the synchronous env provider (no dynamic import,
 *        a real backend, no mock). this is the same handoff CI performs with a role
 *
 * .note = mirrors the shared `useKeyrack` util (ahbode/svc-jobs, ahbode/svc-notifications),
 *         adapted to import keyrack from this repo's own sdk subpath. call from a beforeAll —
 *         it mutates process.env with the static credential keys
 */
export const useKeyrack = (input?: {
  env?: 'test' | 'prep' | 'prod';
  owner?: string;
}): void => {
  const env = input?.env ?? 'test';
  const owner = input?.owner ?? 'ehmpath';

  // skip in CI — credentials arrive from secrets / an attached role, already in the env
  if (process.env.CI) return;

  // skip if keyrack is not configured on this host
  if (!existsSync(join(process.cwd(), '.agent/keyrack.yml'))) return;

  // source the aws profile from keyrack (refreshes the SSO session on demand via aws.config)
  keyrack.source({ env, owner, mode: 'lenient' });

  // if static creds already exist, clear the profile so the SDK does not prefer it over them
  if (process.env.AWS_ACCESS_KEY_ID) {
    delete process.env.AWS_PROFILE;
    delete process.env.AWS_DEFAULT_PROFILE;
    return;
  }

  // no profile sourced — a non-aws env; no profile to export
  const profile = process.env.AWS_PROFILE;
  if (!profile) return;

  // export STATIC creds for the live profile so the SDK uses the synchronous env provider
  const exported = execSync(
    `aws configure export-credentials --profile "${profile}" --format env`,
    { encoding: 'utf8', timeout: 10000 }, // eslint-disable-line @cspell/spellchecker -- node api
  );
  for (const line of exported.split('\n')) {
    const match = line.match(/^export\s+(\w+)=(.*)$/);
    if (match?.[1] && match[2] !== undefined) process.env[match[1]] = match[2];
  }

  // clear the profile so the SDK uses only the static creds (it prefers a profile otherwise)
  delete process.env.AWS_PROFILE;
  delete process.env.AWS_DEFAULT_PROFILE;
};
