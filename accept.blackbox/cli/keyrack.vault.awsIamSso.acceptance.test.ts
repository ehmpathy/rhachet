import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/accept.blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = path to mock aws CLI executable
 * .why = placed on PATH ahead of real aws CLI for guided setup tests
 */
const MOCK_AWS_CLI_DIR = resolve(__dirname, '../.test/assets/mock-aws-cli');

/**
 * .what = path to the rhachet binary
 * .why = needed for pseudo-TTY invocation via the pty-with-answers wrapper
 */
const RHACHET_BIN = resolve(__dirname, '../../bin/run');

/**
 * .what = path to the PTY answer-feeder helper
 * .why = watches stdout for prompt patterns and sends answers on detection (not timing)
 */
const PTY_WITH_ANSWERS = resolve(__dirname, '../.test/assets/pty-with-answers.js');

/**
 * .what = env vars with mock aws CLI on PATH
 * .why = acceptance tests must be fully portable without real AWS credentials
 *
 * .note = mock aws responds to known subcommands (sts get-caller-identity, sso login, etc.)
 * .note = cases that call `set` need this because vaultAdapterAwsIamSso.set validates the profile
 */
const envWithMockAws = (home: string) => ({
  HOME: home,
  PATH: `${MOCK_AWS_CLI_DIR}:${process.env.PATH}`,
});

describe('keyrack vault aws.iam.sso', () => {
  // ensure mock aws executable is chmod +x (git may not preserve permissions)
  beforeAll(() => chmodSync(`${MOCK_AWS_CLI_DIR}/aws`, 0o755));

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
            '--exid',
            'testorg-test',
            '--json',
          ],
          cwd: repo.path,
          env: envWithMockAws(repo.path),
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains configured key', () => {
        const parsed = JSON.parse(result.stdout);
        // single result returned as object, not array
        const entry = Array.isArray(parsed) ? parsed[0] : parsed;
        expect(entry.slug).toEqual('testorg.test.NEW_AWS_KEY');
        expect(entry.mech).toEqual('EPHEMERAL_VIA_AWS_SSO');
        expect(entry.vault).toEqual('aws.iam.sso');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        const entry = Array.isArray(parsed) ? parsed[0] : parsed;
        const snapped = {
          ...entry,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        };
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
            '--exid',
            'testorg-test',
          ],
          cwd: repo.path,
          env: envWithMockAws(repo.path),
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
            '--exid',
            'testorg-test',
            '--json',
          ],
          cwd: repo.path,
          env: envWithMockAws(repo.path),
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('returns found host config', () => {
        const parsed = JSON.parse(result.stdout);
        const entry = Array.isArray(parsed) ? parsed[0] : parsed;
        expect(entry.slug).toEqual('testorg.test.AWS_PROFILE');
        expect(entry.mech).toEqual('EPHEMERAL_VIA_AWS_SSO');
        expect(entry.vault).toEqual('aws.iam.sso');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        const entry = Array.isArray(parsed) ? parsed[0] : parsed;
        const snapped = {
          ...entry,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        };
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
            '--exid',
            'testorg-test',
            '--json',
          ],
          cwd: repo.path,
          env: envWithMockAws(repo.path),
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('mech is inferred as EPHEMERAL_VIA_AWS_SSO', () => {
        const parsed = JSON.parse(result.stdout);
        const entry = Array.isArray(parsed) ? parsed[0] : parsed;
        expect(entry.mech).toEqual('EPHEMERAL_VIA_AWS_SSO');
      });

      then('vault is aws.iam.sso', () => {
        const parsed = JSON.parse(result.stdout);
        const entry = Array.isArray(parsed) ? parsed[0] : parsed;
        expect(entry.vault).toEqual('aws.iam.sso');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        const entry = Array.isArray(parsed) ? parsed[0] : parsed;
        const snapped = {
          ...entry,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        };
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
            '--exid',
            'testorg-test',
          ],
          cwd: repo.path,
          env: envWithMockAws(repo.path),
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
  // skip: --exid roundtrip validation needs rework (see behavior v2026_02_16)
  given.skip('[case7] profile storage with --exid', () => {
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
            '--exid',
            'testorg-test',
            '--json',
          ],
          cwd: repo.path,
          env: envWithMockAws(repo.path),
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
            '--exid',
            'testorg-test',
            '--json',
          ],
          cwd: repo.path,
          env: envWithMockAws(repo.path),
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

    when('[t0] keyrack set for new env (prep)', () => {
      const setResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'PREP_KEY',
            '--env',
            'prep',
            '--vault',
            'aws.iam.sso',
            '--exid',
            'testorg-prep',
            '--json',
          ],
          cwd: repo.path,
          env: envWithMockAws(repo.path),
        }),
      );

      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });

      then('repo manifest has env.prep section', async () => {
        const fs = await import('node:fs/promises');
        const manifestPath = `${repo.path}/.agent/keyrack.yml`;
        const manifest = await fs.readFile(manifestPath, 'utf-8');
        expect(manifest).toContain('env.prep:');
      });

      then('repo manifest has PREP_KEY in env.prep', async () => {
        const fs = await import('node:fs/promises');
        const yaml = await import('yaml');
        const manifestPath = `${repo.path}/.agent/keyrack.yml`;
        const manifest = await fs.readFile(manifestPath, 'utf-8');
        const parsed = yaml.parse(manifest);
        expect(parsed['env.prep']).toContain('PREP_KEY');
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
   * [uc12] relock prunes keys from daemon and clears vault caches
   * keyrack relock calls vault adapter relock to clear aws sso caches
   */
  given('[case12] relock clears aws sso cache', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-aws-iam-sso' }),
    );

    when('[t0] keyrack relock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output indicates keys were pruned', () => {
        // relock reports pruned keys
        const output = result.stdout.toLowerCase();
        expect(output).toMatch(/prune|relock|relocked/i);
      });
    });

    when('[t1] keyrack relock --key specific slug (not in daemon)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock', '--key', 'testorg.test.AWS_PROFILE'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output indicates no keys to prune (key was never unlocked)', () => {
        const output = result.stdout.toLowerCase();
        // key was never unlocked, so daemon has no cached grants to prune
        expect(output).toMatch(/no keys to prune|0 keys pruned/i);
      });
    });

    when('[t2] keyrack relock --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock', '--json'],
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

      then('json contains relocked array', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.relocked).toBeDefined();
        expect(Array.isArray(parsed.relocked)).toBe(true);
      });
    });
  });

  /**
   * [uc13] guided setup roundtrip with mock aws CLI
   *
   * .what = full interactive wizard flow: sso domain -> account -> role -> profile name
   * .why = proves the guided setup path works end-to-end without real AWS credentials
   *
   * .note = uses pseudo-TTY via `script -qec` so process.stdin.isTTY is true
   * .note = mock aws executable on PATH returns canned responses
   * .note = pre-populated ~/.aws/config and ~/.aws/sso/cache for portal discovery
   */
  given('[case13] guided setup with mock aws CLI', () => {
    // cleanup daemon between cases
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      // keyrack init (creates encrypted manifest + ssh key discovery)
      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      // write repo manifest so org is known
      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - AWS_PROFILE\n',
        'utf-8',
      );

      // pre-populate ~/.aws/config with a portal entry
      const awsDir = `${r.path}/.aws`;
      mkdirSync(awsDir, { recursive: true });
      writeFileSync(
        `${awsDir}/config`,
        [
          '[sso-session mock-portal]',
          'sso_start_url = https://mock-portal.awsapps.com/start',
          'sso_region = us-east-1',
          '',
        ].join('\n'),
        'utf-8',
      );

      // pre-populate ~/.aws/sso/cache with a mock access token
      const ssoCacheDir = `${r.path}/.aws/sso/cache`;
      mkdirSync(ssoCacheDir, { recursive: true });
      writeFileSync(
        `${ssoCacheDir}/mock-token.json`,
        JSON.stringify({
          accessToken: 'mock-access-token-for-test',
          expiresAt: '2099-01-01T00:00:00Z',
        }),
        'utf-8',
      );

      return r;
    });

    /**
     * .what = env vars for mock aws PATH override (case-local alias)
     * .why = all commands in this case need mock aws on PATH and isolated HOME
     */
    const envMockAws = () => envWithMockAws(repo.path);

    when('[t0] keyrack set --vault aws.iam.sso via guided wizard (pseudo-TTY)', () => {
      const result = useBeforeAll(async () => {
        // invoke via pseudo-TTY helper so process.stdin.isTTY is true in the child
        // helper detects "choice" prompts in stdout and sends answers on detection (not timing)
        // answers: 1 (portal), 1 (account), 1 (role), empty (accept suggested name)
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key AWS_PROFILE --env test --vault aws.iam.sso`,
            'choice',
            '1', '1', '1', '',
          ],
          {
            encoding: 'utf-8',
            cwd: repo.path,
            env: { ...process.env, ...envMockAws() },
            timeout: 60000,
          },
        );
        return r;
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains wizard prompts', () => {
        const out = result.stdout;
        expect(out).toContain('which sso domain');
        expect(out).toContain('which account');
        expect(out).toContain('which role');
        expect(out).toContain('what should we call it');
      });

      then('host manifest has entry with derived profile name as exid', () => {
        // the profile name is stored as exid in the encrypted host manifest
        // verify via list --json which reads from the host manifest
        const listResult = invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path, PATH: `${MOCK_AWS_CLI_DIR}:${process.env.PATH}` },
        });
        const parsed = JSON.parse(listResult.stdout);
        const entry = parsed['testorg.test.AWS_PROFILE'];
        expect(entry).toBeDefined();
        expect(entry.exid).toEqual('testorg.dev');
      });

      then('~/.aws/config has the new profile section', () => {
        const configPath = `${repo.path}/.aws/config`;
        const config = readFileSync(configPath, 'utf-8');
        expect(config).toContain('[profile testorg.dev]');
        expect(config).toContain('sso_account_id = 123456789012');
        expect(config).toContain('sso_role_name = AdministratorAccess');
      });

      then('stdout matches snapshot', () => {
        // strip ANSI escape codes and PTY control sequences for stable snapshot
        const stripped = result.stdout
          .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '') // ANSI escape sequences
          .replace(/\x1B\]/g, '') // OSC sequences
          .replace(/\r/g, '') // carriage returns from PTY
          .replace(/·/g, '') // middle dots from PTY
          .replace(/\s+$/gm, ''); // trim end-of-line whitespace
        // trim PTY echo noise before tree header
        const treeStart = stripped.indexOf('\u{1F510}');
        const clean = stripped
          .slice(treeStart >= 0 ? treeStart : 0)
          .split('\n')
          .filter((line: string) => line.trim().length > 0)
          .join('\n');
        expect(clean).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list --json after guided set', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: envMockAws(),
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('list contains AWS_PROFILE with aws.iam.sso vault', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.AWS_PROFILE']).toBeDefined();
        expect(parsed['testorg.test.AWS_PROFILE'].vault).toEqual('aws.iam.sso');
        expect(parsed['testorg.test.AWS_PROFILE'].mech).toEqual(
          'EPHEMERAL_VIA_AWS_SSO',
        );
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        const snapped = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [
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

    when('[t2] keyrack get before unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.AWS_PROFILE', '--json'],
          cwd: repo.path,
          env: envMockAws(),
          logOnError: false,
        }),
      );

      then('status is locked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });
    });

    when('[t3] keyrack unlock --env test --key AWS_PROFILE', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'],
          cwd: repo.path,
          env: envMockAws(),
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains the unlocked key slug', () => {
        expect(result.stdout).toContain('testorg.test.AWS_PROFILE');
      });
    });

    when('[t4] keyrack get after unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.AWS_PROFILE', '--json'],
          cwd: repo.path,
          env: envMockAws(),
        }),
      );

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value is the profile name', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('testorg.dev');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t5] keyrack relock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock'],
          cwd: repo.path,
          env: envMockAws(),
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });
    });

    when('[t6] keyrack get after relock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.AWS_PROFILE', '--json'],
          cwd: repo.path,
          env: envMockAws(),
          logOnError: false,
        }),
      );

      then('status is locked again', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });
    });
  });
});
