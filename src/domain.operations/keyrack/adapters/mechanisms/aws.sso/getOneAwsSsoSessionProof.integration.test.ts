import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneAwsSsoSessionProof } from './getOneAwsSsoSessionProof';

/**
 * .what = the env keys this suite rewrites, restored after
 * .why = the proof reads the real aws sdk and the real aws cli, which both read HOME, the
 *        config file, and any ambient creds; a ci role's env creds must not leak into a
 *        profile read, and the host's own sso cache must stay out of reach
 */
const ENV_KEYS = [
  'HOME',
  'AWS_CONFIG_FILE',
  'AWS_SHARED_CREDENTIALS_FILE',
  'AWS_PROFILE',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'AWS_SDK_MOCK',
] as const;

/**
 * .what = the real aws sso boundary, on the path that needs no creds: a profile whose
 *         portal session has no token at all
 * .why = the renew's lapse line rests on the exact sentences the real sdk and the real cli
 *        write for a dead session (`isAwsSsoSessionEndedError`). the mock cli pins what we
 *        believe they write; this pins what they do write, so a drift in either is red here
 *        rather than a lapse read as a fault (a key that halts) or a fault read as a lapse
 *
 * .note = a live session's happy path needs a human's sso login, which no committed test
 *         holds; the yield's live proof covers it (two expiries on a real profile)
 */
describe('getOneAwsSsoSessionProof', () => {
  const home = genTempDir({ slug: 'getOneAwsSsoSessionProof' });
  const envBefore = Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key]]),
  );

  beforeAll(() => {
    // fail fast where the real aws cli is absent; this suite exists to call it
    const probe = spawnSync('aws', ['--version'], { stdio: 'pipe' });
    if (probe.status !== 0)
      throw new ConstraintError('the aws cli v2 is required for this suite', {
        hint: 'install the aws cli v2, per the aws cli install guide',
      });

    // an sso profile under a temp HOME, with an empty sso token cache
    mkdirSync(join(home, '.aws', 'sso', 'cache'), { recursive: true });
    writeFileSync(
      join(home, '.aws', 'config'),
      [
        '[profile rhachet-proof-test]',
        'sso_session = rhachet-proof-portal',
        'sso_account_id = 123456789012',
        'sso_role_name = AdministratorAccess',
        'region = us-east-1',
        '',
        '[sso-session rhachet-proof-portal]',
        'sso_start_url = https://rhachet-proof-portal.awsapps.com/start',
        'sso_region = us-east-1',
        '',
      ].join('\n'),
      'utf-8',
    );

    // point both readers at it, with no ambient creds
    process.env.HOME = home;
    process.env.AWS_CONFIG_FILE = join(home, '.aws', 'config');
    process.env.AWS_SHARED_CREDENTIALS_FILE = join(home, '.aws', 'credentials');
    delete process.env.AWS_PROFILE;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_SESSION_TOKEN;
  });

  afterAll(() => {
    ENV_KEYS.forEach((key) => {
      const value = envBefore[key];
      if (value === undefined) delete process.env[key];
      if (value !== undefined) process.env[key] = value;
    });
  });

  given('[case1] an sso profile whose portal session holds no token', () => {
    when('[t0] the real sdk gate reads it', () => {
      const proof = useBeforeAll(async () => {
        delete process.env.AWS_SDK_MOCK;
        return {
          result: await getOneAwsSsoSessionProof({
            profileName: 'rhachet-proof-test',
            onInvalidLevel: 'debug',
          }),
        };
      });

      then('the proof reads a lapse, never a fault', () => {
        expect(proof.result).toEqual({ live: false });
      });
    });

    when('[t1] the real cli gate reads it, the sdk gate skipped', () => {
      const proof = useBeforeAll(async () => {
        process.env.AWS_SDK_MOCK = '1';
        return {
          result: await getOneAwsSsoSessionProof({
            profileName: 'rhachet-proof-test',
            onInvalidLevel: 'debug',
          }),
        };
      });

      then('the proof reads a lapse, never a fault', () => {
        expect(proof.result).toEqual({ live: false });
      });
    });
  });
});
