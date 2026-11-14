import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { addDuration, asIsoTimeStamp, isIsoTimeStamp } from 'iso-time';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { genAwsProfileExport } from './genAwsProfileExport';

/**
 * .what = the env keys that could hand the cli creds or a profile from outside the box
 * .why = each case must read only the config files it writes, never the runner's own creds
 */
const AWS_ENV_FOREIGN = [
  'AWS_PROFILE',
  'AWS_DEFAULT_PROFILE',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'AWS_CREDENTIAL_EXPIRATION',
  'AWS_ROLE_ARN',
  'AWS_WEB_IDENTITY_TOKEN_FILE',
  'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI',
  'AWS_CONTAINER_CREDENTIALS_FULL_URI',
];

/**
 * .what = the real aws cli must be on PATH, else the suite fails fast
 * .why = this suite proves the op against the real cli's output shape; a skip would hide that
 */
const assertAwsCliOnPath = (): void => {
  const probe = spawnSync('aws', ['--version'], { stdio: 'ignore' });
  if (probe.status === 0) return;
  throw new ConstraintError('the real aws cli is required for this suite', {
    hint: 'install aws cli v2 (https://aws.amazon.com/cli/), then rerun',
  });
};

/**
 * .what = a temp HOME with its own aws config files, and the env that points the real cli at them
 * .why = the cli resolves a static profile and a credential_process profile on the box, with no
 *   network call, so the real cli runs hermetic: no sso session, no runner creds
 * .note = the fixture values are fictional and avoid the vendor key shape
 */
const genRealAwsBox = (input: { slug: string; expiration: string }) => {
  const home = genTempDir({ slug: input.slug });
  const configPath = join(home, 'aws.config');
  const credentialsPath = join(home, 'aws.credentials');
  const processPath = join(home, 'cred-process.sh');
  writeFileSync(
    processPath,
    [
      '#!/usr/bin/env bash',
      `echo '${JSON.stringify({
        Version: 1,
        AccessKeyId: 'realcli-process-key-id',
        SecretAccessKey: 'realcli-process-secret',
        SessionToken: 'realcli-process-token',
        Expiration: input.expiration,
      })}'`,
    ].join('\n'),
    { mode: 0o755 },
  );
  writeFileSync(
    configPath,
    [
      '[profile acme-realcli-process]',
      `credential_process = ${processPath}`,
      '',
    ].join('\n'),
  );
  writeFileSync(
    credentialsPath,
    [
      '[acme-realcli-static]',
      'aws_access_key_id = realcli-static-key-id',
      'aws_secret_access_key = realcli-static-secret',
      '',
    ].join('\n'),
  );
  return {
    home,
    env: {
      HOME: home,
      AWS_CONFIG_FILE: configPath,
      AWS_SHARED_CREDENTIALS_FILE: credentialsPath,
    },
  };
};

/**
 * .what = set process.env for a case, with the foreign aws keys removed, and put it back after
 */
const useRealAwsEnv = (input: { env: () => Record<string, string> }) => {
  const original = { ...process.env };
  beforeAll(() => {
    for (const key of AWS_ENV_FOREIGN) delete process.env[key];
    Object.assign(process.env, input.env());
  });
  afterAll(() => {
    for (const key of Object.keys(process.env))
      if (!(key in original)) delete process.env[key];
    Object.assign(process.env, original);
  });
};

describe('genAwsProfileExport, against the real aws cli', () => {
  beforeAll(() => assertAwsCliOnPath());

  given('[case1] a profile whose credential_process names an expiry', () => {
    // a whole-second instant, so the cli's own form of it compares exactly
    const expiration = addDuration(
      asIsoTimeStamp(new Date(Math.floor(Date.now() / 1000) * 1000)),
      { hours: 1 },
    );
    const box = genRealAwsBox({ slug: 'aws-export-realcli-c1', expiration });
    useRealAwsEnv({ env: () => box.env });

    when('[t0] the op exports it', () => {
      const result = useBeforeAll(async () =>
        genAwsProfileExport({
          profile: 'acme-realcli-process',
          refresh: false,
        }),
      );

      then('the creds are the ones the real cli emitted', () => {
        expect(result.credentials.AWS_ACCESS_KEY_ID).toEqual(
          'realcli-process-key-id',
        );
        expect(result.credentials.AWS_SECRET_ACCESS_KEY).toEqual(
          'realcli-process-secret',
        );
        expect(result.credentials.AWS_SESSION_TOKEN).toEqual(
          'realcli-process-token',
        );
      });

      then(
        "the cli's own expiry form is read as the same instant, in the strict utc form",
        () => {
          // the real cli prints python's isoformat (`…+00:00`); the op casts it at the boundary
          expect(result.credentials.AWS_CREDENTIAL_EXPIRATION).not.toEqual(
            expiration,
          );
          expect(isIsoTimeStamp(result.expiresAt)).toEqual(true);
          expect(new Date(result.expiresAt).getTime()).toEqual(
            new Date(expiration).getTime(),
          );
        },
      );
    });
  });

  given('[case2] a static profile, whose cli export names no expiry', () => {
    const box = genRealAwsBox({
      slug: 'aws-export-realcli-c2',
      expiration: asIsoTimeStamp(new Date()),
    });
    useRealAwsEnv({ env: () => box.env });

    when('[t0] the op exports it', () => {
      const exported = useBeforeAll(async () => {
        const begun = Date.now();
        const result = await genAwsProfileExport({
          profile: 'acme-realcli-static',
          refresh: false,
        });
        return { begun, result };
      });

      then('the creds are the static ones in the credentials file', () => {
        expect(exported.result.credentials.AWS_ACCESS_KEY_ID).toEqual(
          'realcli-static-key-id',
        );
        expect(exported.result.credentials.AWS_SECRET_ACCESS_KEY).toEqual(
          'realcli-static-secret',
        );
        expect(
          exported.result.credentials.AWS_CREDENTIAL_EXPIRATION,
        ).toBeUndefined();
      });

      then('the expiry is the fifty-five minute fallback bound', () => {
        const lifeMs =
          new Date(exported.result.expiresAt).getTime() - exported.begun;
        expect(lifeMs).toBeGreaterThan(54 * 60_000);
        expect(lifeMs).toBeLessThanOrEqual(56 * 60_000);
      });
    });
  });

  given('[case3] a profile absent from both config files', () => {
    const box = genRealAwsBox({
      slug: 'aws-export-realcli-c3',
      expiration: asIsoTimeStamp(new Date()),
    });
    useRealAwsEnv({ env: () => box.env });

    when('[t0] the op exports it', () => {
      // .note = wrapped in an object, since useBeforeAll hands back a proxy an instanceof cannot see through
      const caught = useBeforeAll(async () => ({
        error: await getError(
          genAwsProfileExport({
            profile: 'acme-realcli-absent',
            refresh: false,
          }),
        ),
      }));

      then("it fails loud with the real cli's own complaint", () => {
        expect(caught.error).toBeInstanceOf(MalfunctionError);
        expect(caught.error.message).toContain(
          'aws configure export-credentials failed',
        );
        expect(caught.error.message).toContain('acme-realcli-absent');
        // the cli's own words for an absent profile ride in the error, never a credential value
        expect(caught.error.message).toMatch(/could not be found/);
      });

      then('no cache file is left for the profile', () => {
        const dir = join(
          box.home,
          '.rhachet',
          'keyrack',
          'cache',
          'aws.export',
        );
        const files = existsSync(dir)
          ? readdirSync(dir).filter((name) =>
              name.startsWith('profile=acme-realcli-absent.'),
            )
          : [];
        expect(files).toEqual([]);
      });
    });
  });
});
