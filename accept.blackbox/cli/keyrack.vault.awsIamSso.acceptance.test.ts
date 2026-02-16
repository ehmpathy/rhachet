import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('keyrack vault aws.iam.sso', () => {
  /**
   * [uc1] list command with aws.iam.sso vault
   * shows configured keys with vault type
   */
  given('[case1] repo with aws.iam.sso vault configured', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-aws-iam-sso' }),
    );

    when('[t0] keyrack list --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output is valid json', () => {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      });

      then('json contains AWS_PROFILE with aws.iam.sso vault', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.AWS_PROFILE']).toBeDefined();
        expect(parsed['testorg.test.AWS_PROFILE'].vault).toEqual('aws.iam.sso');
      });

      then('json contains EPHEMERAL_VIA_AWS_SSO mech', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.AWS_PROFILE'].mech).toEqual(
          'EPHEMERAL_VIA_AWS_SSO',
        );
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        const snapped = Object.fromEntries(
          Object.entries(parsed).map(([k, v]: [string, any]) => [
            k,
            {
              ...(v as Record<string, unknown>),
              createdAt: '__TIMESTAMP__',
              updatedAt: '__TIMESTAMP__',
            },
          ]),
        );
        expect(snapped).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list (human readable)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains AWS_PROFILE', () => {
        expect(result.stdout).toContain('AWS_PROFILE');
      });

      then('output contains aws.iam.sso', () => {
        expect(result.stdout).toContain('aws.iam.sso');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc2] set command creates new aws.iam.sso host entry
   */
  given('[case2] repo without host entry for a key', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-aws-iam-sso' }),
    );

    when('[t0] keyrack set --key NEW_AWS_KEY --mech EPHEMERAL_VIA_AWS_SSO --vault aws.iam.sso', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'NEW_AWS_KEY',
            '--env',
            'test',
            '--mech',
            'EPHEMERAL_VIA_AWS_SSO',
            '--vault',
            'aws.iam.sso',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains configured key', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed[0].slug).toEqual('testorg.test.NEW_AWS_KEY');
        expect(parsed[0].mech).toEqual('EPHEMERAL_VIA_AWS_SSO');
        expect(parsed[0].vault).toEqual('aws.iam.sso');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        const snapped = parsed.map((entry: Record<string, unknown>) => ({
          ...entry,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        }));
        expect(snapped).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list after set', () => {
      // first set the key
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'ANOTHER_AWS_KEY',
            '--env',
            'test',
            '--mech',
            'EPHEMERAL_VIA_AWS_SSO',
            '--vault',
            'aws.iam.sso',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const listResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('list shows the new key', () => {
        const parsed = JSON.parse(listResult.stdout);
        expect(parsed['testorg.test.ANOTHER_AWS_KEY']).toBeDefined();
        expect(parsed['testorg.test.ANOTHER_AWS_KEY'].vault).toEqual(
          'aws.iam.sso',
        );
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(listResult.stdout);
        // redact timestamps for stable snapshots
        const snapped = Object.fromEntries(
          Object.entries(parsed).map(([k, v]: [string, any]) => [
            k,
            {
              ...(v as Record<string, unknown>),
              createdAt: '__TIMESTAMP__',
              updatedAt: '__TIMESTAMP__',
            },
          ]),
        );
        expect(snapped).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc3] get with aws.iam.sso shows locked when session cannot be validated
   * (no real aws cli available in test env)
   */
  given('[case3] repo with aws.iam.sso vault', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-aws-iam-sso' }),
    );

    when('[t0] keyrack get --key AWS_PROFILE --json (no valid sso session)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.AWS_PROFILE', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('returns locked or invalid status', () => {
        const parsed = JSON.parse(result.stdout);
        // either locked (vault not unlocked) or invalid (session validation failed)
        expect(['locked', 'invalid']).toContain(parsed.status);
      });

      then('fix mentions unlock or session', () => {
        const parsed = JSON.parse(result.stdout);
        const fix = parsed.fix?.toLowerCase() ?? '';
        const message = parsed.message?.toLowerCase() ?? '';
        const combined = fix + message;
        expect(combined).toMatch(/unlock|session|sso/i);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc4] findsert semantics with aws.iam.sso
   * set key that already has same attrs returns found
   */
  given('[case4] findsert semantics', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-aws-iam-sso' }),
    );

    when('[t0] set key that already has same attrs', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'AWS_PROFILE',
            '--env',
            'test',
            '--mech',
            'EPHEMERAL_VIA_AWS_SSO',
            '--vault',
            'aws.iam.sso',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('returns found host config', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed[0].slug).toEqual('testorg.test.AWS_PROFILE');
        expect(parsed[0].mech).toEqual('EPHEMERAL_VIA_AWS_SSO');
        expect(parsed[0].vault).toEqual('aws.iam.sso');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        const snapped = parsed.map((entry: Record<string, unknown>) => ({
          ...entry,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        }));
        expect(snapped).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc5] multiple envs with aws.iam.sso
   * verifies both prod and test AWS_PROFILE keys are listed
   */
  given('[case5] repo with multiple envs configured', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-aws-iam-sso' }),
    );

    when('[t0] keyrack list --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('json contains prod AWS_PROFILE', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.prod.AWS_PROFILE']).toBeDefined();
        expect(parsed['testorg.prod.AWS_PROFILE'].vault).toEqual('aws.iam.sso');
      });

      then('json contains test AWS_PROFILE', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.AWS_PROFILE']).toBeDefined();
        expect(parsed['testorg.test.AWS_PROFILE'].vault).toEqual('aws.iam.sso');
      });
    });
  });

  /**
   * [uc6] mech inference from vault
   * --vault aws.iam.sso without --mech should infer EPHEMERAL_VIA_AWS_SSO
   */
  given('[case6] mech inference from aws.iam.sso vault', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-aws-iam-sso' }),
    );

    when('[t0] keyrack set --key INFERRED_KEY --vault aws.iam.sso (no --mech)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'INFERRED_KEY',
            '--env',
            'test',
            '--vault',
            'aws.iam.sso',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('mech is inferred as EPHEMERAL_VIA_AWS_SSO', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed[0].mech).toEqual('EPHEMERAL_VIA_AWS_SSO');
      });

      then('vault is aws.iam.sso', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed[0].vault).toEqual('aws.iam.sso');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        const snapped = parsed.map((entry: Record<string, unknown>) => ({
          ...entry,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        }));
        expect(snapped).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list shows inferred mech', () => {
      // first set the key without --mech
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'INFERRED_KEY_2',
            '--env',
            'test',
            '--vault',
            'aws.iam.sso',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const listResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('list shows EPHEMERAL_VIA_AWS_SSO mech', () => {
        const parsed = JSON.parse(listResult.stdout);
        expect(parsed['testorg.test.INFERRED_KEY_2'].mech).toEqual(
          'EPHEMERAL_VIA_AWS_SSO',
        );
      });
    });
  });

  /**
   * [uc7] profile storage with --exid
   * --exid stores profile name in vault storage for pre-configured profiles
   */
  given('[case7] profile storage with --exid', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-aws-iam-sso' }),
    );

    when('[t0] keyrack set with --exid stores profile name', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'AWS_PROFILE_EXID',
            '--env',
            'test',
            '--vault',
            'aws.iam.sso',
            '--exid',
            'my-preconfigured-profile',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('set command returns configured key', () => {
        const parsed = JSON.parse(result.stdout);
        // note: set command returns slug/vault/mech, exid is in host manifest
        // exid is verified via list command in [t1]
        expect(parsed[0].slug).toEqual('testorg.test.AWS_PROFILE_EXID');
        expect(parsed[0].vault).toEqual('aws.iam.sso');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        const snapped = parsed.map((entry: Record<string, unknown>) => ({
          ...entry,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        }));
        expect(snapped).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list shows exid for pre-configured profile', () => {
      // first set the key with --exid
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'AWS_PROFILE_EXID_2',
            '--env',
            'test',
            '--vault',
            'aws.iam.sso',
            '--exid',
            'another-profile',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const listResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('list shows exid for the key', () => {
        const parsed = JSON.parse(listResult.stdout);
        expect(parsed['testorg.test.AWS_PROFILE_EXID_2'].exid).toEqual(
          'another-profile',
        );
      });
    });
  });

  /**
   * [uc8] unlock command with aws.iam.sso vault
   * verifies unlock behavior when sso session is not valid
   *
   * note: aws sso requires browser auth which cannot be automated in ci.
   * this test verifies that unlock attempts validation and fails gracefully.
   */
  given('[case8] unlock with aws.iam.sso vault (no valid sso session)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-aws-iam-sso' }),
    );

    when('[t0] keyrack unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        // unlock should fail because no valid sso session in test env
        expect(result.status).not.toEqual(0);
      });

      then('output indicates sso session validation failed', () => {
        const output = (result.stdout + result.stderr).toLowerCase();
        // should mention sso, session, or login requirement
        expect(output).toMatch(/sso|session|expired|login|unlock|failed/i);
      });
    });
  });

  /**
   * [uc9] repo manifest auto-update on set
   * keyrack set automatically adds key to repo manifest (.agent/keyrack.yml)
   * user should never need to manually edit the manifest
   */
  given('[case9] repo manifest auto-update on set', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-aws-iam-sso' }),
    );

    when('[t0] keyrack set adds NEW_MANIFEST_KEY', () => {
      const setResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'NEW_MANIFEST_KEY',
            '--env',
            'test',
            '--vault',
            'aws.iam.sso',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });

      then('repo manifest contains NEW_MANIFEST_KEY in env.test', async () => {
        const fs = await import('node:fs/promises');
        const manifestPath = `${repo.path}/.agent/keyrack.yml`;
        const manifest = await fs.readFile(manifestPath, 'utf-8');
        expect(manifest).toContain('NEW_MANIFEST_KEY');
        expect(manifest).toContain('env.test:');
      });

      then('repo manifest snapshot', async () => {
        const fs = await import('node:fs/promises');
        const manifestPath = `${repo.path}/.agent/keyrack.yml`;
        const manifest = await fs.readFile(manifestPath, 'utf-8');
        expect(manifest).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc10] repo manifest no duplicate on re-set
   * keyrack set does not duplicate key if already in manifest
   */
  given('[case10] repo manifest no duplicate on re-set', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-aws-iam-sso' }),
    );

    when('[t0] keyrack set for key already in manifest (AWS_PROFILE)', () => {
      const setResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'AWS_PROFILE',
            '--env',
            'test',
            '--vault',
            'aws.iam.sso',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });

      then('repo manifest has AWS_PROFILE exactly once in env.test', async () => {
        const fs = await import('node:fs/promises');
        const manifestPath = `${repo.path}/.agent/keyrack.yml`;
        const manifest = await fs.readFile(manifestPath, 'utf-8');

        // count occurrences of AWS_PROFILE in env.test section
        // parse the yaml to check the env.test array
        const yaml = await import('yaml');
        const parsed = yaml.parse(manifest);
        const testKeys = parsed['env.test'] || [];
        const awsProfileCount = testKeys.filter(
          (k: string) => k === 'AWS_PROFILE',
        ).length;
        expect(awsProfileCount).toEqual(1);
      });

      then('repo manifest snapshot', async () => {
        const fs = await import('node:fs/promises');
        const manifestPath = `${repo.path}/.agent/keyrack.yml`;
        const manifest = await fs.readFile(manifestPath, 'utf-8');
        expect(manifest).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc11] repo manifest creates env section if absent
   * keyrack set creates env.$env section when it does not exist
   */
  given('[case11] repo manifest creates env section if absent', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-aws-iam-sso' }),
    );

    when('[t0] keyrack set for new env (dev)', () => {
      const setResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'DEV_KEY',
            '--env',
            'dev',
            '--vault',
            'aws.iam.sso',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });

      then('repo manifest has env.dev section', async () => {
        const fs = await import('node:fs/promises');
        const manifestPath = `${repo.path}/.agent/keyrack.yml`;
        const manifest = await fs.readFile(manifestPath, 'utf-8');
        expect(manifest).toContain('env.dev:');
      });

      then('repo manifest has DEV_KEY in env.dev', async () => {
        const fs = await import('node:fs/promises');
        const yaml = await import('yaml');
        const manifestPath = `${repo.path}/.agent/keyrack.yml`;
        const manifest = await fs.readFile(manifestPath, 'utf-8');
        const parsed = yaml.parse(manifest);
        expect(parsed['env.dev']).toContain('DEV_KEY');
      });

      then('repo manifest snapshot', async () => {
        const fs = await import('node:fs/promises');
        const manifestPath = `${repo.path}/.agent/keyrack.yml`;
        const manifest = await fs.readFile(manifestPath, 'utf-8');
        expect(manifest).toMatchSnapshot();
      });
    });
  });
});
