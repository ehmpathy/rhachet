import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { given, then, useBeforeAll, when } from 'test-fns';

import { envIsolated } from '@/blackbox/.test/infra/envIsolated';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
  invokeRhachetCliBinaryAsync,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';
import { maskKeyrackGrantVolatiles } from '@/blackbox/.test/infra/maskKeyrackGrantVolatiles';

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
 * .mock = the aws cli binary at the far end of PATH
 * .why = a real export needs a live sso session, which no ci runner holds
 * .real = genAwsProfileExport.awscli.integration.test.ts runs the real aws cli against hermetic
 *   config files, for its output shape, its `+00:00` expiry, and its failure path
 * .note = mock aws responds to known subcommands (sts get-caller-identity, sso login, etc.)
 * .note = cases that call `set` need this because vaultAdapterAwsIamSso.set validates the profile
 */
const envWithMockAws = (home: string) => ({
  ...envIsolated(home),
  PATH: `${MOCK_AWS_CLI_DIR}:${process.env.PATH}`,
  AWS_SDK_MOCK: '1', // skip SDK validation in mock mode
});

/**
 * .what = the dir keyrack caches aws exports in, under a given HOME
 * .why = the acceptance cases count and inspect the cache the cli leaves on disk
 */
const cacheDirOf = (home: string): string =>
  `${home}/.rhachet/keyrack/cache/aws.export`;

/**
 * .what = a temp repo whose keyrack holds one aws.config key, `AWS_PROFILE` → `testorg.dev`, with a
 *   cold export cache
 * .why = the export cases ([case20], [case21]) each start from the same setup, in their own HOME
 */
const genAwsExportRepo = async (): Promise<{ path: string }> => {
  const r = await genTestTempRepo({ fixture: 'minimal' });
  invokeRhachetCliBinary({
    args: ['keyrack', 'init'],
    cwd: r.path,
    env: { HOME: r.path },
  });
  const agentDir = `${r.path}/.agent`;
  if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
  writeFileSync(
    `${agentDir}/keyrack.yml`,
    'org: testorg\n\nenv.test:\n  - AWS_PROFILE\n',
    'utf-8',
  );
  const awsDir = `${r.path}/.aws`;
  mkdirSync(awsDir, { recursive: true });
  writeFileSync(
    `${awsDir}/config`,
    [
      '[profile testorg.dev]',
      'sso_session = testorg-sso',
      'sso_account_id = 123456789012',
      'sso_role_name = AdministratorAccess',
      '',
      '[sso-session testorg-sso]',
      'sso_start_url = https://d-12345abcde.awsapps.com/start',
      'sso_region = us-east-1',
      '',
    ].join('\n'),
    'utf-8',
  );
  invokeRhachetCliBinary({
    args: [
      'keyrack',
      'set',
      '--key',
      'AWS_PROFILE',
      '--env',
      'test',
      '--vault',
      'aws.config',
      '--exid',
      'testorg.dev',
    ],
    cwd: r.path,
    env: { ...envWithMockAws(r.path), MOCK_AWS_IDENTITY: 'alice' },
  });

  // the set roundtrip ends in a vault relock, which drops the export it made; the rm pins a cold
  //   cache for every count regardless of that relock
  rmSync(cacheDirOf(r.path), { recursive: true, force: true });
  return r;
};

/**
 * .what = the env of an export case: the mock aws on PATH, a live identity, and an export log
 * .why = the export log lets a case count how many exports the cli ran
 */
const asEnvExportCounted = (input: {
  home: string;
  mode?: 'fail';
}): Record<string, string | undefined> => ({
  ...envWithMockAws(input.home),
  MOCK_AWS_IDENTITY: 'alice',
  MOCK_AWS_EXPORT_CALLS: `${input.home}/.mock-aws-export-calls`,
  ...(input.mode ? { MOCK_AWS_EXPORT_MODE: input.mode } : {}),
});

/**
 * .what = how many exports the mock aws ran under a HOME
 */
const getAwsExportCallCount = (input: { home: string }): number => {
  const path = `${input.home}/.mock-aws-export-calls`;
  if (!existsSync(path)) return 0;
  return readFileSync(path, 'utf-8').split('\n').filter(Boolean).length;
};

/**
 * .what = sanitize unlock result for snapshot comparison
 * .why = expiresAt is dynamic and varies each run
 */
const asUnlockSnapshotSafe = (
  parsed: Record<string, unknown>,
): Record<string, unknown> => {
  const unlocked = parsed.unlocked as Array<Record<string, unknown>> | undefined;
  if (!unlocked) return parsed;
  return {
    ...parsed,
    unlocked: unlocked.map((key) => ({
      ...key,
      expiresAt: '__TIMESTAMP__',
    })),
  };
};

describe('keyrack vault aws.config', () => {
  // ensure mock aws executable is chmod +x (git may not preserve permissions)
  beforeAll(() => chmodSync(`${MOCK_AWS_CLI_DIR}/aws`, 0o755));

  /**
   * [uc1] list command with aws.config vault
   * shows configured keys with vault type
   */
  given('[case1] repo with aws.config vault configured', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-aws-iam-sso' }),
    );

    when('[t0] keyrack list --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: envIsolated(repo.path),
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output is valid json', () => {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      });

      then('json contains AWS_PROFILE with aws.config vault', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.AWS_PROFILE']).toBeDefined();
        expect(parsed['testorg.test.AWS_PROFILE'].vault).toEqual('aws.config');
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
          env: envIsolated(repo.path),
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains AWS_PROFILE', () => {
        expect(result.stdout).toContain('AWS_PROFILE');
      });

      then('output contains aws.config', () => {
        expect(result.stdout).toContain('aws.config');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc2] set command creates new aws.config host entry
   */
  given('[case2] repo without host entry for a key', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-aws-iam-sso' }),
    );

    when('[t0] keyrack set --key NEW_AWS_KEY --mech EPHEMERAL_VIA_AWS_SSO --vault aws.config', () => {
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
            'aws.config',
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
        expect(entry.vault).toEqual('aws.config');
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
      const setResult = useBeforeAll(async () =>
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
            'aws.config',
            '--exid',
            'testorg-test',
            '--json',
          ],
          cwd: repo.path,
          env: envWithMockAws(repo.path),
        }),
      );

      then('set stdout matches snapshot', () => {
        const parsed = JSON.parse(setResult.stdout);
        const entry = Array.isArray(parsed) ? parsed[0] : parsed;
        const snapped = {
          ...entry,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        };
        expect(snapped).toMatchSnapshot();
      });

      const listResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: envIsolated(repo.path),
        }),
      );

      then('list shows the new key', () => {
        const parsed = JSON.parse(listResult.stdout);
        expect(parsed['testorg.test.ANOTHER_AWS_KEY']).toBeDefined();
        expect(parsed['testorg.test.ANOTHER_AWS_KEY'].vault).toEqual(
          'aws.config',
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
   * [uc3] get with aws.config shows absent when not in daemon
   *
   * .note = aws.config vault cannot be checked without manifest decrypt
   * .note = profile name (exid) is stored in encrypted host manifest
   * .note = therefore aws.config keys show 'absent' until unlocked
   */
  given('[case3] repo with aws.config vault', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-aws-iam-sso' }),
    );

    when('[t0] keyrack get --key AWS_PROFILE --json (no valid sso session)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.AWS_PROFILE', '--json'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('returns absent status (aws.config cannot be checked without manifest)', () => {
        const parsed = JSON.parse(result.stdout);
        // .note = aws.config vault cannot be checked without manifest decrypt
        // .note = exid (profile name) varies and is stored in encrypted manifest
        expect(parsed.status).toEqual('absent');
      });

      then('fix mentions set', () => {
        const parsed = JSON.parse(result.stdout);
        const fix = parsed.fix?.toLowerCase() ?? '';
        // .note = since status is 'absent', fix suggests set (not unlock)
        expect(fix).toContain('set');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc4] findsert semantics with aws.config
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
            'aws.config',
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
        expect(entry.vault).toEqual('aws.config');
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
   * [uc5] multiple envs with aws.config
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
          env: envIsolated(repo.path),
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('json contains prod AWS_PROFILE', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.prod.AWS_PROFILE']).toBeDefined();
        expect(parsed['testorg.prod.AWS_PROFILE'].vault).toEqual('aws.config');
      });

      then('json contains test AWS_PROFILE', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.AWS_PROFILE']).toBeDefined();
        expect(parsed['testorg.test.AWS_PROFILE'].vault).toEqual('aws.config');
      });
    });
  });

  /**
   * [uc6] mech inference from vault
   * --vault aws.config without --mech should infer EPHEMERAL_VIA_AWS_SSO
   */
  given('[case6] mech inference from aws.config vault', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-aws-iam-sso' }),
    );

    when('[t0] keyrack set --key INFERRED_KEY --vault aws.config (no --mech)', () => {
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
            'aws.config',
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

      then('vault is aws.config', () => {
        const parsed = JSON.parse(result.stdout);
        const entry = Array.isArray(parsed) ? parsed[0] : parsed;
        expect(entry.vault).toEqual('aws.config');
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
      const setResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'INFERRED_KEY_2',
            '--env',
            'test',
            '--vault',
            'aws.config',
            '--exid',
            'testorg-test',
            '--json',
          ],
          cwd: repo.path,
          env: envWithMockAws(repo.path),
        }),
      );

      then('set stdout matches snapshot', () => {
        const parsed = JSON.parse(setResult.stdout);
        const entry = Array.isArray(parsed) ? parsed[0] : parsed;
        const snapped = {
          ...entry,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        };
        expect(snapped).toMatchSnapshot();
      });

      const listResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: envIsolated(repo.path),
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
  // note: --exid roundtrip validation reworked in behavior v2026_02_16
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
            'aws.config',
            '--exid',
            'my-preconfigured-profile',
            '--json',
          ],
          cwd: repo.path,
          env: envWithMockAws(repo.path),
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('set command returns configured key', () => {
        const parsed = JSON.parse(result.stdout);
        // note: set command returns slug/vault/mech, exid is in host manifest
        // exid is verified via list command in [t1]
        // note: output may be array or object depending on command path
        const entry = Array.isArray(parsed) ? parsed[0] : parsed;
        expect(entry.slug).toEqual('testorg.test.AWS_PROFILE_EXID');
        expect(entry.vault).toEqual('aws.config');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // cast to array for consistent snapshot handling
        const entries = Array.isArray(parsed) ? parsed : [parsed];
        const snapped = entries.map((entry: Record<string, unknown>) => ({
          ...entry,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        }));
        expect(snapped).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list shows exid for pre-configured profile', () => {
      // first set the key with --exid
      const setResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'AWS_PROFILE_EXID_2',
            '--env',
            'test',
            '--vault',
            'aws.config',
            '--exid',
            'another-profile',
            '--json',
          ],
          cwd: repo.path,
          env: envWithMockAws(repo.path),
        }),
      );

      then('set stdout matches snapshot', () => {
        const parsed = JSON.parse(setResult.stdout);
        const entry = Array.isArray(parsed) ? parsed[0] : parsed;
        const snapped = {
          ...entry,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        };
        expect(snapped).toMatchSnapshot();
      });

      const listResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: envIsolated(repo.path),
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
   * [uc8] unlock command with aws.config vault
   * verifies unlock behavior when sso session is not valid
   *
   * note: aws sso requires browser auth which cannot be automated in ci.
   * this test verifies that unlock attempts validation and fails gracefully.
   */
  given('[case8] unlock with aws.config vault (no valid sso session)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-aws-iam-sso' }),
    );

    when('[t0] keyrack unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock'],
          cwd: repo.path,
          env: envIsolated(repo.path),
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
            'aws.config',
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
            'aws.config',
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

      then('set stdout matches snapshot', () => {
        const parsed = JSON.parse(setResult.stdout);
        const entry = Array.isArray(parsed) ? parsed[0] : parsed;
        const snapped = {
          ...entry,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        };
        expect(snapped).toMatchSnapshot();
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
            'aws.config',
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

      then('set stdout matches snapshot', () => {
        const parsed = JSON.parse(setResult.stdout);
        const entry = Array.isArray(parsed) ? parsed[0] : parsed;
        const snapped = {
          ...entry,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        };
        expect(snapped).toMatchSnapshot();
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

    when('[t0] keyrack relock (human readable)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock'],
          cwd: repo.path,
          env: envIsolated(repo.path),
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output indicates relock command succeeded', () => {
        const output = result.stdout.toLowerCase();
        // human-readable output should contain relock-related text
        expect(output).toMatch(/relock|prune|relocked/i);
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] keyrack relock --key specific slug (not in daemon)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock', '--key', 'testorg.test.AWS_PROFILE'],
          cwd: repo.path,
          env: envIsolated(repo.path),
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

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] keyrack relock --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock', '--json'],
          cwd: repo.path,
          env: envIsolated(repo.path),
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

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
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

      // pre-populate ~/.aws/config with a portal entry and extant profiles
      // .note = profiles use $org.$env pattern for common prefix extraction
      const awsDir = `${r.path}/.aws`;
      mkdirSync(awsDir, { recursive: true });
      writeFileSync(
        `${awsDir}/config`,
        [
          '[sso-session testorg-sso]',
          'sso_start_url = https://d-12345abcde.awsapps.com/start',
          'sso_region = us-east-1',
          '',
          '[profile testorg.prod]',
          'sso_session = testorg-sso',
          'sso_account_id = 111111111111',
          'sso_role_name = AdminRole',
          '',
          '[profile testorg.prep]',
          'sso_session = testorg-sso',
          'sso_account_id = 222222222222',
          'sso_role_name = AdminRole',
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

    when('[t0] keyrack set --vault aws.config via guided wizard (pseudo-TTY)', () => {
      const result = useBeforeAll(async () => {
        // invoke via pseudo-TTY helper so process.stdin.isTTY is true in the child
        // helper detects "choice" prompts in stdout and sends answers on detection (not timing)
        // answers: 1 (portal), 1 (account), 1 (role), empty (accept suggested name)
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key AWS_PROFILE --env test --vault aws.config`,
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
          .replace(/[ \t]+$/gm, ''); // trim end-of-line spaces/tabs (not newlines)
        // trim PTY echo noise before tree header
        const treeStart = stripped.indexOf('\u{1F510}');
        const clean = stripped
          .slice(treeStart >= 0 ? treeStart : 0)
          .trim();
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

      then('list contains AWS_PROFILE with aws.config vault', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.AWS_PROFILE']).toBeDefined();
        expect(parsed['testorg.test.AWS_PROFILE'].vault).toEqual('aws.config');
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

      then('status is locked (inventory records key)', () => {
        const parsed = JSON.parse(result.stdout);
        // .note = inventory is vault-agnostic source of truth
        // .note = after guided setup, inventory entry exists → status is 'locked'
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

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
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

      then('value is the profile name (not credentials json)', () => {
        // .note = vault adapter returns profile name; AWS SDK resolves creds from profile
        // .note = user sets AWS_PROFILE=$(rhx keyrack get --key AWS_PROFILE --env test)
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

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
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

      then('status is locked (inventory persists after relock)', () => {
        const parsed = JSON.parse(result.stdout);
        // .note = inventory is vault-agnostic source of truth
        // .note = inventory entry persists after relock → status is 'locked'
        expect(parsed.status).toEqual('locked');
      });
    });
  });

  given('[case14] unlock WITHOUT identity collision (valid session)', () => {
    // .what = unlock when SSO session is valid for the requested profile
    // .why = verify smooth flow without forced re-auth when identity matches

    // cleanup daemon between cases
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      // keyrack init
      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      // write repo manifest
      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - AWS_PROFILE\n',
        'utf-8',
      );

      // pre-populate ~/.aws/config with profile
      const awsDir = `${r.path}/.aws`;
      mkdirSync(awsDir, { recursive: true });
      writeFileSync(
        `${awsDir}/config`,
        [
          '[profile testorg.dev]',
          'sso_session = testorg-sso',
          'sso_account_id = 123456789012',
          'sso_role_name = AdministratorAccess',
          '',
          '[sso-session testorg-sso]',
          'sso_start_url = https://d-12345abcde.awsapps.com/start',
          'sso_region = us-east-1',
          '',
        ].join('\n'),
        'utf-8',
      );

      // pre-create host manifest entry
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'AWS_PROFILE',
          '--env',
          'test',
          '--vault',
          'aws.config',
          '--exid',
          'testorg.dev',
        ],
        cwd: r.path,
        env: {
          ...envIsolated(r.path),
          PATH: `${MOCK_AWS_CLI_DIR}:${process.env.PATH}`,
          AWS_SDK_MOCK: '1',
          MOCK_AWS_IDENTITY: 'alice', // populate meta.awsSsoUsername
        },
      });

      return r;
    });

    when('[t0] keyrack unlock with valid SSO session (alice)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'],
          cwd: repo.path,
          env: {
            ...envIsolated(repo.path),
            PATH: `${MOCK_AWS_CLI_DIR}:${process.env.PATH}`,
            AWS_SDK_MOCK: '1',
            MOCK_AWS_IDENTITY: 'alice', // valid session for alice
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output shows unlock without collision clear', () => {
        // should NOT contain ✗ (collision) in "with sso prior?" section
        // should show ✓ and proceed directly to unlock
        expect(result.stdout).toContain('testorg.test.AWS_PROFILE');
        expect(result.stdout).not.toContain('✗');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case15] unlock WITH identity collision (wrong user cached)', () => {
    // .what = unlock when cached SSO session belongs to different user
    // .why = verify collision detection clears cache and prompts re-auth

    // cleanup daemon between cases
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      // keyrack init
      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      // write repo manifest
      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - AWS_PROFILE\n',
        'utf-8',
      );

      // pre-populate ~/.aws/config with profile
      const awsDir = `${r.path}/.aws`;
      mkdirSync(awsDir, { recursive: true });
      writeFileSync(
        `${awsDir}/config`,
        [
          '[profile testorg.dev]',
          'sso_session = testorg-sso',
          'sso_account_id = 123456789012',
          'sso_role_name = AdministratorAccess',
          '',
          '[sso-session testorg-sso]',
          'sso_start_url = https://d-12345abcde.awsapps.com/start',
          'sso_region = us-east-1',
          '',
        ].join('\n'),
        'utf-8',
      );

      // pre-populate ~/.aws/sso/cache with bob's session (wrong user)
      const ssoCacheDir = `${r.path}/.aws/sso/cache`;
      mkdirSync(ssoCacheDir, { recursive: true });
      writeFileSync(
        `${ssoCacheDir}/bob-session.json`,
        JSON.stringify({
          startUrl: 'https://d-12345abcde.awsapps.com/start',
          region: 'us-east-1',
          accessToken: 'bobs-access-token',
          expiresAt: '2099-01-01T00:00:00Z',
        }),
        'utf-8',
      );

      // pre-create host manifest entry
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'AWS_PROFILE',
          '--env',
          'test',
          '--vault',
          'aws.config',
          '--exid',
          'testorg.dev',
        ],
        cwd: r.path,
        env: {
          ...envIsolated(r.path),
          PATH: `${MOCK_AWS_CLI_DIR}:${process.env.PATH}`,
          AWS_SDK_MOCK: '1',
          MOCK_AWS_IDENTITY: 'alice', // populate meta.awsSsoUsername with alice
        },
      });

      return r;
    });

    when('[t0] keyrack unlock with wrong user cached (bob, need alice)', () => {
      const result = useBeforeAll(async () => {
        // state file for mock to track re-auth transition
        const stateFile = `${repo.path}/.mock-aws-state`;
        return invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'],
          cwd: repo.path,
          env: {
            ...envIsolated(repo.path),
            PATH: `${MOCK_AWS_CLI_DIR}:${process.env.PATH}`,
            AWS_SDK_MOCK: '1',
            MOCK_AWS_IDENTITY_BEFORE: 'bob', // initial: bob cached
            MOCK_AWS_IDENTITY_AFTER: 'alice', // after re-auth: alice
            MOCK_AWS_STATE_FILE: stateFile,
          },
        });
      });

      then('exits with status 0 (re-auth succeeds)', () => {
        expect(result.status).toEqual(0);
      });

      then('output renders the cross-username recovery tree (vision)', () => {
        // .note = recovery is a live interactive event, so it surfaces in the CLI
        //         even though per-key unlock runs silent for the routine reuse path
        // .note = the full coherent tree (header + mismatch + closer) must show —
        //         not orphaned recovery fragments
        expect(result.stdout).toContain('with sso prior?');
        expect(result.stdout).toContain('session user mismatch');
        expect(result.stdout).toContain('expected: alice@acme.com');
        expect(result.stdout).toContain('observed: bob@acme.com');
        expect(result.stdout).toContain('authenticated as alice@acme.com');
      });

      then('cache file was deleted', () => {
        const ssoCacheDir = `${repo.path}/.aws/sso/cache`;
        const files = existsSync(ssoCacheDir) ? readdirSync(ssoCacheDir) : [];
        // bob's session should be cleared
        expect(files).not.toContain('bob-session.json');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case16] set key WITHOUT identity collision (no prior session)', () => {
    // .what = guided setup when no prior SSO session exists
    // .why = verify pre-logout step shows "clear" even with no session (defensive)

    // cleanup daemon between cases
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      // keyrack init
      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      // write repo manifest
      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - AWS_PROFILE\n',
        'utf-8',
      );

      // pre-populate ~/.aws/config with sso-session and extant profiles
      // .note = profiles use $org.$env pattern for common prefix extraction
      const awsDir = `${r.path}/.aws`;
      mkdirSync(awsDir, { recursive: true });
      writeFileSync(
        `${awsDir}/config`,
        [
          '[sso-session testorg-sso]',
          'sso_start_url = https://d-12345abcde.awsapps.com/start',
          'sso_region = us-east-1',
          '',
          '[profile testorg.prod]',
          'sso_session = testorg-sso',
          'sso_account_id = 111111111111',
          'sso_role_name = AdminRole',
          '',
          '[profile testorg.prep]',
          'sso_session = testorg-sso',
          'sso_account_id = 222222222222',
          'sso_role_name = AdminRole',
          '',
        ].join('\n'),
        'utf-8',
      );

      // pre-populate mock token (simulates what aws sso login creates)
      // .note = NO startUrl field so pre-logout won't clear it
      // .note = this simulates the cache that exists AFTER successful login
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

    when('[t0] keyrack set --vault aws.config via guided wizard (no prior session)', () => {
      const result = useBeforeAll(async () => {
        // invoke via pseudo-TTY helper
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key AWS_PROFILE --env test --vault aws.config`,
            'choice',
            '1', '1', '1', '',
          ],
          {
            encoding: 'utf-8',
            cwd: repo.path,
            env: {
              ...process.env,
              ...envIsolated(repo.path),
              PATH: `${MOCK_AWS_CLI_DIR}:${process.env.PATH}`,
              AWS_SDK_MOCK: '1',
              MOCK_AWS_IDENTITY: 'alice', // valid session
            },
            timeout: 60000,
          },
        );
        return r;
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains pre-logout step with clear (no collision)', () => {
        const out = result.stdout;
        // pre-logout step shows as "with sso prior?" with clear
        expect(out).toContain('which sso domain');
        expect(out).toMatch(/sso prior|prior.*clear/i);
      });

      then('stdout matches snapshot', () => {
        const stripped = result.stdout
          .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
          .replace(/\x1B\]/g, '')
          .replace(/\r/g, '')
          .replace(/·/g, '')
          .replace(/[ \t]+$/gm, '');  // only strip spaces/tabs, not newlines
        const treeStart = stripped.indexOf('\u{1F510}');
        const clean = stripped
          .slice(treeStart >= 0 ? treeStart : 0)
          .trim();
        expect(clean).toMatchSnapshot();
      });
    });
  });

  given('[case17] set key WITH identity collision (different user cached)', () => {
    // .what = guided setup when different user SSO session is cached
    // .why = verify pre-logout clears conflict session before browser auth

    // cleanup daemon between cases
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      // keyrack init
      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      // write repo manifest
      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - AWS_PROFILE\n',
        'utf-8',
      );

      // pre-populate ~/.aws/config with sso-session and extant profiles
      // .note = profiles use $org.$env pattern for common prefix extraction
      const awsDir = `${r.path}/.aws`;
      mkdirSync(awsDir, { recursive: true });
      writeFileSync(
        `${awsDir}/config`,
        [
          '[sso-session testorg-sso]',
          'sso_start_url = https://d-12345abcde.awsapps.com/start',
          'sso_region = us-east-1',
          '',
          '[profile testorg.prod]',
          'sso_session = testorg-sso',
          'sso_account_id = 111111111111',
          'sso_role_name = AdminRole',
          '',
          '[profile testorg.prep]',
          'sso_session = testorg-sso',
          'sso_account_id = 222222222222',
          'sso_role_name = AdminRole',
          '',
        ].join('\n'),
        'utf-8',
      );

      // pre-populate SSO cache with bob session (will be cleared by pre-logout)
      const ssoCacheDir = `${r.path}/.aws/sso/cache`;
      mkdirSync(ssoCacheDir, { recursive: true });
      writeFileSync(
        `${ssoCacheDir}/bob-wrong-user.json`,
        JSON.stringify({
          startUrl: 'https://d-12345abcde.awsapps.com/start',
          region: 'us-east-1',
          accessToken: 'bobs-access-token-will-be-cleared',
          expiresAt: '2099-01-01T00:00:00Z',
        }),
        'utf-8',
      );

      // also add mock token (simulates what aws sso login creates AFTER clear)
      // .note = NO startUrl field so pre-logout won't clear it
      // .note = this is what remains after bob's session is cleared and alice logs in
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

    when('[t0] keyrack set --vault aws.config via guided wizard (bob cached, alice auth)', () => {
      const result = useBeforeAll(async () => {
        // invoke via pseudo-TTY helper
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key AWS_PROFILE --env test --vault aws.config`,
            'choice',
            '1', '1', '1', '',
          ],
          {
            encoding: 'utf-8',
            cwd: repo.path,
            env: {
              ...process.env,
              ...envIsolated(repo.path),
              PATH: `${MOCK_AWS_CLI_DIR}:${process.env.PATH}`,
              AWS_SDK_MOCK: '1',
              MOCK_AWS_IDENTITY: 'alice', // alice authenticates after cache clear
            },
            timeout: 60000,
          },
        );
        return r;
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains pre-logout step (cache cleared before auth)', () => {
        const out = result.stdout;
        // pre-logout step clears bob session before browser auth
        expect(out).toContain('which sso domain');
        expect(out).toMatch(/sso prior|prior.*clear/i);
      });

      then('bob session was cleared from cache', () => {
        const ssoCacheDir = `${repo.path}/.aws/sso/cache`;
        const files = existsSync(ssoCacheDir) ? readdirSync(ssoCacheDir) : [];
        // bob session file should be gone (cleared by pre-logout)
        expect(files).not.toContain('bob-wrong-user.json');
      });

      then('stdout matches snapshot', () => {
        const stripped = result.stdout
          .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
          .replace(/\x1B\]/g, '')
          .replace(/\r/g, '')
          .replace(/·/g, '')
          .replace(/[ \t]+$/gm, ''); // trim end-of-line spaces/tabs (not newlines)
        const treeStart = stripped.indexOf('\u{1F510}');
        const clean = stripped
          .slice(treeStart >= 0 ? treeStart : 0)
          .trim();
        // mask the cached session's expiry stamp, so the snapshot holds no raw timestamp
        expect(asSnapshotSafe(clean)).toMatchSnapshot();
      });
    });
  });

  given('[case18] unlock mode 1: invalid session recovers to correct user', () => {
    // .what = unlock when the post-login session is invalid (mode 1), then a
    //         single re-login recovers to the correct user
    // .why = prove the CLI surfaces the "clear, no prior session" → authenticated
    //        recovery tree even though per-key unlock runs silent

    // cleanup daemon between cases
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - AWS_PROFILE\n',
        'utf-8',
      );

      const awsDir = `${r.path}/.aws`;
      mkdirSync(awsDir, { recursive: true });
      writeFileSync(
        `${awsDir}/config`,
        [
          '[profile testorg.dev]',
          'sso_session = testorg-sso',
          'sso_account_id = 123456789012',
          'sso_role_name = AdministratorAccess',
          '',
          '[sso-session testorg-sso]',
          'sso_start_url = https://d-12345abcde.awsapps.com/start',
          'sso_region = us-east-1',
          '',
        ].join('\n'),
        'utf-8',
      );

      // pre-create host manifest entry (captures meta.awsSsoUsername = alice)
      invokeRhachetCliBinary({
        args: [
          'keyrack', 'set', '--key', 'AWS_PROFILE', '--env', 'test',
          '--vault', 'aws.config', '--exid', 'testorg.dev',
        ],
        cwd: r.path,
        env: {
          ...envIsolated(r.path),
          PATH: `${MOCK_AWS_CLI_DIR}:${process.env.PATH}`,
          AWS_SDK_MOCK: '1',
          MOCK_AWS_IDENTITY: 'alice',
        },
      });

      return r;
    });

    // warm the export cache with one unlock as alice, then drop the daemon so the unlock under
    //   test runs the whole vault flow again
    // .note = the set's roundtrip ends in a vault relock, which drops the cache, so the set alone
    //   leaves it cold
    const exportsWarm = useBeforeAll(async () => {
      invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'],
        cwd: repo.path,
        env: {
          ...envIsolated(repo.path),
          PATH: `${MOCK_AWS_CLI_DIR}:${process.env.PATH}`,
          AWS_SDK_MOCK: '1',
          MOCK_AWS_IDENTITY: 'alice',
          MOCK_AWS_EXPORT_CALLS: `${repo.path}/.mock-aws-export-calls`,
        },
      });
      killKeyrackDaemonForTests({ owner: null });
      return {
        count: getAwsExportCallCount({ home: repo.path }),
        cacheFiles: readdirSync(cacheDirOf(repo.path)).filter((name) => name.endsWith('.json')),
      };
    });

    when('[t0] keyrack unlock with invalid session that recovers to alice', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'],
          cwd: repo.path,
          env: {
            ...envIsolated(repo.path),
            PATH: `${MOCK_AWS_CLI_DIR}:${process.env.PATH}`,
            AWS_SDK_MOCK: '1',
            // sts@login0 invalid → login → sts@login1 alice
            MOCK_AWS_IDENTITY_STAGES: 'invalid,alice',
            MOCK_AWS_STATE_FILE: `${repo.path}/.mock-aws-stages`,
            MOCK_AWS_EXPORT_CALLS: `${repo.path}/.mock-aws-export-calls`,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the warm-up unlock left one export cached', () => {
        expect(exportsWarm.count).toEqual(1);
        expect(exportsWarm.cacheFiles).toHaveLength(1);
      });

      then('each re-login replaces the warm cached creds with exactly one fresh export (case 7)', () => {
        // .note = the pre-login check reads the warm cache (no export); each login's refresh drops
        //   that entry and exports anew, so the creds served are the post-login ones. the mock
        //   appends one char to its state file per login
        const logins = readFileSync(`${repo.path}/.mock-aws-stages`, 'utf-8').length;
        expect(logins).toBeGreaterThanOrEqual(1);
        expect(getAwsExportCallCount({ home: repo.path })).toEqual(exportsWarm.count + logins);
      });

      then('output renders the no-prior-session recovery tree', () => {
        expect(result.stdout).toContain('with sso prior?');
        expect(result.stdout).toContain('clear, no prior session');
        expect(result.stdout).toContain('authenticated as alice@acme.com');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case19] unlock mode 2 deep: wrong user persists, then recovers', () => {
    // .what = unlock when the browser re-auths as the wrong user AGAIN after the
    //         first login, which forces a second logout+retry inside recovery (mode 2 deep)
    // .why = prove the full vision tree — with the "wrong user, logout browser
    //        session" recovery loop line — surfaces in the CLI

    // cleanup daemon between cases
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - AWS_PROFILE\n',
        'utf-8',
      );

      const awsDir = `${r.path}/.aws`;
      mkdirSync(awsDir, { recursive: true });
      writeFileSync(
        `${awsDir}/config`,
        [
          '[profile testorg.dev]',
          'sso_session = testorg-sso',
          'sso_account_id = 123456789012',
          'sso_role_name = AdministratorAccess',
          '',
          '[sso-session testorg-sso]',
          'sso_start_url = https://d-12345abcde.awsapps.com/start',
          'sso_region = us-east-1',
          '',
        ].join('\n'),
        'utf-8',
      );

      // pre-create host manifest entry (captures meta.awsSsoUsername = alice)
      invokeRhachetCliBinary({
        args: [
          'keyrack', 'set', '--key', 'AWS_PROFILE', '--env', 'test',
          '--vault', 'aws.config', '--exid', 'testorg.dev',
        ],
        cwd: r.path,
        env: {
          ...envIsolated(r.path),
          PATH: `${MOCK_AWS_CLI_DIR}:${process.env.PATH}`,
          AWS_SDK_MOCK: '1',
          MOCK_AWS_IDENTITY: 'alice',
        },
      });

      return r;
    });

    when('[t0] keyrack unlock where re-auth stays wrong once, then recovers', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'],
          cwd: repo.path,
          env: {
            ...envIsolated(repo.path),
            PATH: `${MOCK_AWS_CLI_DIR}:${process.env.PATH}`,
            AWS_SDK_MOCK: '1',
            // sts@login0 bob (mismatch) → login → sts@login1 bob (still wrong)
            // → recovery logout+login → sts@login2 alice (recovered)
            MOCK_AWS_IDENTITY_STAGES: 'bob,bob,alice',
            MOCK_AWS_STATE_FILE: `${repo.path}/.mock-aws-stages`,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output renders the full deep-recovery tree with the wrong-user loop', () => {
        expect(result.stdout).toContain('with sso prior?');
        expect(result.stdout).toContain('session user mismatch');
        expect(result.stdout).toContain('wrong user, logout browser session');
        expect(result.stdout).toContain('logged out, retry login');
        expect(result.stdout).toContain('authenticated as alice@acme.com');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case20] repeated unlocks of one profile share one export (ehmpathy/rhachet#656)', () => {
    // .what = the aws export runs once per profile per box, then a disk cache serves it
    // .why = a jest env that unlocks one profile many times ran `aws configure export-credentials`
    //        per unlock; the export is now single-flight behind an owner-only cache

    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => genAwsExportRepo());
    const envCounted = () => asEnvExportCounted({ home: repo.path });
    const getExportCallCount = () =>
      getAwsExportCallCount({ home: repo.path });

    when('[t0] keyrack unlock runs twice for one profile', () => {
      const results = useBeforeAll(async () => {
        const first = invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'],
          cwd: repo.path,
          env: envCounted(),
        });
        const second = invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'],
          cwd: repo.path,
          env: envCounted(),
        });
        return { first, second };
      });

      then('both exit 0', () => {
        expect(results.first.status).toEqual(0);
        expect(results.second.status).toEqual(0);
      });

      then('the aws cli exported once across both unlocks', () => {
        expect(getExportCallCount()).toEqual(1);
      });

      then('the cache file is readable only by its owner, in an owner-only dir', () => {
        const dir = cacheDirOf(repo.path);
        const files = readdirSync(dir).filter((name) => name.endsWith('.json'));
        expect(files).toHaveLength(1);
        expect(statSync(dir).mode & 0o777).toEqual(0o700);
        expect(statSync(`${dir}/${files[0]}`).mode & 0o777).toEqual(0o600);
      });

      then('no credential value reaches stdout or stderr', () => {
        for (const result of [results.first, results.second]) {
          const output = result.stdout + result.stderr;
          expect(output).not.toContain('MockSecretAccessKey');
          expect(output).not.toContain('AKIA_MOCK_ACCESS_KEY_123');
          expect(output).not.toContain('MockSessionToken');
        }
      });

      then('the two unlock rows match snapshot: the cached unlock renders the same row as the cold one', () => {
        expect({
          first: maskKeyrackGrantVolatiles({ stdout: asSnapshotSafe(results.first.stdout) }),
          second: maskKeyrackGrantVolatiles({ stdout: asSnapshotSafe(results.second.stdout) }),
        }).toMatchSnapshot();
      });
    });

    when('[t1] keyrack relock, then keyrack unlock again', () => {
      // .note = runs after [t0], so the daemon holds the grant and the cache holds its export
      const results = useBeforeAll(async () => {
        const filesBefore = readdirSync(cacheDirOf(repo.path)).filter((name) =>
          name.endsWith('.json'),
        );
        const relock = invokeRhachetCliBinary({
          args: ['keyrack', 'relock'],
          cwd: repo.path,
          env: envCounted(),
        });
        const filesAfterRelock = readdirSync(cacheDirOf(repo.path)).filter(
          (name) => name.endsWith('.json'),
        );
        const unlock = invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'],
          cwd: repo.path,
          env: envCounted(),
        });
        return { filesBefore, relock, filesAfterRelock, unlock };
      });

      then('the relock exits 0 and prunes the key', () => {
        expect(results.relock.status).toEqual(0);
        expect(results.relock.stdout).toContain('testorg.test.AWS_PROFILE: pruned 🔒');
      });

      then('the relock drops the cached export of the profile', () => {
        expect(results.filesBefore).toHaveLength(1);
        expect(results.filesAfterRelock).toEqual([]);
      });

      then('the next unlock exports anew', () => {
        expect(results.unlock.status).toEqual(0);
        expect(getExportCallCount()).toEqual(2);
      });
    });

    /**
     * .what = relock one key by slug, then by env, each over a held grant and a warm cache
     * .why = a relock narrowed by `--key` or `--env` must still drop the export of the aws.config
     *   grant it prunes, or owner-only creds outlive the relock on disk
     */
    const relockThenUnlock = async (input: { relockArgs: string[] }) => {
      const filesBefore = readdirSync(cacheDirOf(repo.path)).filter((name) =>
        name.endsWith('.json'),
      );
      const relock = invokeRhachetCliBinary({
        args: ['keyrack', 'relock', ...input.relockArgs],
        cwd: repo.path,
        env: envCounted(),
      });
      const filesAfterRelock = readdirSync(cacheDirOf(repo.path)).filter(
        (name) => name.endsWith('.json'),
      );
      const unlock = invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'],
        cwd: repo.path,
        env: envCounted(),
      });
      return {
        filesBefore,
        relock,
        filesAfterRelock,
        unlock,
        count: getExportCallCount(),
      };
    };

    when('[t2] keyrack relock --key on the held slug, then keyrack unlock again', () => {
      // .note = runs after [t1], whose unlock left the grant held and its export cached
      const results = useBeforeAll(async () =>
        relockThenUnlock({ relockArgs: ['--key', 'testorg.test.AWS_PROFILE'] }),
      );

      then('the relock exits 0 and drops the cached export', () => {
        expect(results.relock.status).toEqual(0);
        expect(results.filesBefore).toHaveLength(1);
        expect(results.filesAfterRelock).toEqual([]);
      });

      then('the relock stdout names the pruned key, and matches snapshot', () => {
        expect(results.relock.stdout).toContain('testorg.test.AWS_PROFILE: pruned 🔒');
        expect(asSnapshotSafe(results.relock.stdout)).toMatchSnapshot();
      });

      then('the next unlock exports anew', () => {
        expect(results.unlock.status).toEqual(0);
        expect(results.count).toEqual(3);
      });
    });

    when('[t3] keyrack relock --env test, then keyrack unlock again', () => {
      // .note = runs after [t2], whose unlock left the grant held and its export cached
      const results = useBeforeAll(async () =>
        relockThenUnlock({ relockArgs: ['--env', 'test'] }),
      );

      then('the relock exits 0 and drops the cached export', () => {
        expect(results.relock.status).toEqual(0);
        expect(results.filesBefore).toHaveLength(1);
        expect(results.filesAfterRelock).toEqual([]);
      });

      then('the relock stdout names the pruned key, and matches snapshot', () => {
        expect(results.relock.stdout).toContain('testorg.test.AWS_PROFILE: pruned 🔒');
        expect(asSnapshotSafe(results.relock.stdout)).toMatchSnapshot();
      });

      then('the next unlock exports anew', () => {
        expect(results.unlock.status).toEqual(0);
        expect(results.count).toEqual(4);
      });
    });
  });

  given('[case21] the export under a burst and under faults, via rhx keyrack unlock (ehmpathy/rhachet#656)', () => {
    // .what = the unlock a human runs: parallel callers share one export, and each export fault
    //         reaches the unlock row with its own fix and exit code
    // .note = each `when` prunes the daemon and drops the cache first, so its unlock meets the vault cold

    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => genAwsExportRepo());
    const unlockArgs = ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'];
    const setColdStart = () => {
      invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: asEnvExportCounted({ home: repo.path }),
      });
      rmSync(cacheDirOf(repo.path), { recursive: true, force: true });
      rmSync(`${repo.path}/.mock-aws-export-calls`, { force: true });
    };

    when('[t0] three unlocks of one profile run at once', () => {
      // .note = the results sit under a key, since useBeforeAll hands back an object proxy
      const burst = useBeforeAll(async () => {
        setColdStart();
        const results = await Promise.all(
          [0, 1, 2].map(() =>
            invokeRhachetCliBinaryAsync({
              args: unlockArgs,
              cwd: repo.path,
              // a 4s export outlasts the spread of three cli startups, so the peers wait on it
              env: { ...asEnvExportCounted({ home: repo.path }), MOCK_AWS_EXPORT_SLEEP: '4' },
            }),
          ),
        );
        return { results };
      });

      then('all three exit 0', () => {
        expect(burst.results.map((result) => result.status)).toEqual([0, 0, 0]);
      });

      then('the aws cli exported once across all three', () => {
        expect(getAwsExportCallCount({ home: repo.path })).toEqual(1);
      });

      then('a wait notice, if any, is on stderr, never stdout', () => {
        for (const result of burst.results) {
          expect(result.stdout).not.toContain('another process exports aws credentials');
          expect(result.stdout + result.stderr).not.toContain('MockSecretAccessKey');
          expect(result.stdout + result.stderr).not.toContain('AKIA_MOCK_ACCESS_KEY_123');
        }
      });

      then('a peer that waits prints the one wait notice on stderr', () => {
        const notices = burst.results
          .map((result) => result.stderr)
          .filter((stderr) => stderr.includes('another process exports aws credentials'));
        expect(notices.length).toBeGreaterThanOrEqual(1);
        for (const notice of notices)
          expect(notice).toContain(
            "ℹ another process exports aws credentials for profile testorg.dev; this one will wait for it, up to 5 minutes (if the other process was killed, the wait ends on its own within 3 minutes)",
          );
      });

      then('the distinct stdout and stderr across the burst match snapshot', () => {
        // .note = which caller exports varies run to run, so the set of distinct outputs is pinned
        expect({
          stdouts: [
            ...new Set(
              burst.results.map((result) =>
                maskKeyrackGrantVolatiles({ stdout: asSnapshotSafe(result.stdout) }),
              ),
            ),
          ].sort(),
          // .note = only non-empty stderrs: each unlock asks more than once, so whether any caller
          //   stays silent turns on the race; the notice text is what a human reads
          stderrsDistinct: [
            ...new Set(
              burst.results
                .map((result) => asSnapshotSafe(result.stderr))
                .filter((stderr) => stderr !== ''),
            ),
          ].sort(),
        }).toMatchSnapshot();
      });
    });

    when('[t1] the aws cli fails the export', () => {
      const result = useBeforeAll(async () => {
        setColdStart();
        return invokeRhachetCliBinary({
          args: unlockArgs,
          cwd: repo.path,
          env: asEnvExportCounted({ home: repo.path, mode: 'fail' }),
          logOnError: false,
        });
      });

      then('it exits 1, a malfunction a retry may cure', () => {
        expect(result.status).toEqual(1);
      });

      then('the row names the cli fault and the retry, never a value', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('aws configure export-credentials failed');
        expect(output).toContain('— retry: rhx keyrack unlock');
        expect(output).not.toContain('MockSecretAccessKey');
          expect(output).not.toContain('AKIA_MOCK_ACCESS_KEY_123');
      });

      then('no export is cached', () => {
        const dir = cacheDirOf(repo.path);
        const files = existsSync(dir)
          ? readdirSync(dir).filter((name) => name.endsWith('.json'))
          : [];
        expect(files).toEqual([]);
      });

      then('stdout and stderr match snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t2] a file sits at the cache dir path', () => {
      const result = useBeforeAll(async () => {
        setColdStart();
        mkdirSync(`${repo.path}/.rhachet/keyrack/cache`, { recursive: true });
        writeFileSync(cacheDirOf(repo.path), 'not a dir', 'utf-8');
        return invokeRhachetCliBinary({
          args: unlockArgs,
          cwd: repo.path,
          env: asEnvExportCounted({ home: repo.path }),
          logOnError: false,
        });
      });
      afterAll(() => rmSync(cacheDirOf(repo.path), { force: true }));

      then('it exits 2, a constraint the human fixes', () => {
        expect(result.status).toEqual(2);
      });

      then('the row names the path and the move that cures it, never a retry', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('a file blocks the aws export cache dir');
        expect(output).toContain('— fix: move aside the file at');
        expect(output).not.toContain('readable and writable');
        expect(output).toContain('.rhachet/keyrack/cache/aws.export');
        expect(output).not.toContain('— retry');
      });

      then('the aws cli ran no export', () => {
        expect(getAwsExportCallCount({ home: repo.path })).toEqual(0);
      });

      then('stdout and stderr match snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });

    // .note = the title says "offset form", never the literal offset: the snap name carries it, and the
    //         commit hook reads a literal offset as a clock time
    when('[t3] the credentials expire in 20 minutes, in the utc offset form the real cli prints', () => {
      // .note = the grant follows the creds' own expiry, as it did on main for the `…Z` form; the
      //         `+00:00` form once fell to a flat 55 min (fulcrum F17)
      const result = useBeforeAll(async () => {
        setColdStart();
        const expiration = new Date(Date.now() + 20 * 60 * 1000)
          .toISOString()
          .replace(/\.\d{3}Z$/, '+00:00');
        return invokeRhachetCliBinary({
          args: unlockArgs,
          cwd: repo.path,
          env: {
            ...asEnvExportCounted({ home: repo.path }),
            MOCK_AWS_EXPORT_EXPIRATION: expiration,
          },
        });
      });

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the grant expires with the creds, in about 20 minutes', () => {
        expect(result.stdout).toMatch(/expires in: (19|20)m/);
      });

      then('the unlock row matches snapshot, the minute count pinned to ~20m', () => {
        // .note = the minute count ticks 19 or 20 run to run; the snap shows it as `~20m`
        const stdout = asSnapshotSafe(result.stdout).replace(/expires in: (19|20)m/, 'expires in: ~20m');
        expect(stdout).toContain('expires in: ~20m');
        expect(maskKeyrackGrantVolatiles({ stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case22] keyrack set at a profile with no sso config', () => {
    // .what = set an aws.config key whose profile holds static config, no sso_session
    // .why = a re-login cannot cure a profile with no sso config; the caller is told to pick an
    //   sso profile or os.direct, never sent to `aws sso login`

    // cleanup daemon between cases
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      // keyrack init
      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      // write repo manifest
      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - AWS_PROFILE\n',
        'utf-8',
      );

      // a profile with static config only: no sso_session, no sso_start_url
      const awsDir = `${r.path}/.aws`;
      mkdirSync(awsDir, { recursive: true });
      writeFileSync(
        `${awsDir}/config`,
        ['[profile testorg.static]', 'region = us-east-1', ''].join('\n'),
        'utf-8',
      );

      return r;
    });

    when('[t0] keyrack set --vault aws.config --exid testorg.static', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'AWS_PROFILE',
            '--env',
            'test',
            '--vault',
            'aws.config',
            '--exid',
            'testorg.static',
          ],
          cwd: repo.path,
          env: {
            ...envIsolated(repo.path),
            PATH: `${MOCK_AWS_CLI_DIR}:${process.env.PATH}`,
            // .note = the real sdk check runs: it reads the profile from HOME's aws config and
            //   refuses a profile with no sso config before any network call
            AWS_SDK_MOCK: undefined,
            AWS_CONFIG_FILE: undefined,
            AWS_SHARED_CREDENTIALS_FILE: undefined,
          },
        }),
      );

      then('it exits 2, a constraint the caller fixes', () => {
        expect(result.status).toEqual(2);
      });

      then('the output names the profile as no sso profile', () => {
        expect(result.stdout + result.stderr).toContain(
          'aws profile is not an sso profile; the aws.config vault needs one',
        );
      });

      then('the output names the cure, an sso profile or os.direct', () => {
        expect(result.stdout + result.stderr).toContain('os.direct');
      });

      then('the output never sends the caller to aws sso login', () => {
        expect(result.stdout + result.stderr).not.toContain('aws sso login');
      });

      then('stdout and stderr match snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case23] a cached export that no longer fits, via rhx keyrack unlock (ehmpathy/rhachet#656)', () => {
    // .what = the cache serves an export only while it has life left past the margin, and only to
    //         the profile config it was exported under (catalog cases 3 and 8)
    // .note = the daemon is killed between the two unlocks of a `when`, so the second meets the vault
    //         and its cache, never a grant the daemon still holds

    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => genAwsExportRepo());
    const unlockArgs = ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'];
    const setColdStart = () => {
      killKeyrackDaemonForTests({ owner: null });
      rmSync(cacheDirOf(repo.path), { recursive: true, force: true });
      rmSync(`${repo.path}/.mock-aws-export-calls`, { force: true });
    };
    const asExpirationIn = (input: { minutes: number }): string =>
      new Date(Date.now() + input.minutes * 60 * 1000)
        .toISOString()
        .replace(/\.\d{3}Z$/, 'Z');

    /**
     * .what = two unlocks of one profile, the daemon killed between them, with a hook between
     * .why = each `when` varies only what changes between the two unlocks
     */
    const unlockTwice = async (input: {
      env: Record<string, string | undefined>;
      between: () => void;
    }) => {
      const first = invokeRhachetCliBinary({ args: unlockArgs, cwd: repo.path, env: input.env });
      const countAfterFirst = getAwsExportCallCount({ home: repo.path });
      killKeyrackDaemonForTests({ owner: null });
      input.between();
      const second = invokeRhachetCliBinary({ args: unlockArgs, cwd: repo.path, env: input.env });
      return {
        first,
        second,
        countAfterFirst,
        count: getAwsExportCallCount({ home: repo.path }),
      };
    };

    when('[t0] the cached credentials expire in 10 minutes, inside the 15 minute margin', () => {
      const results = useBeforeAll(async () => {
        setColdStart();
        return unlockTwice({
          env: {
            ...asEnvExportCounted({ home: repo.path }),
            MOCK_AWS_EXPORT_EXPIRATION: asExpirationIn({ minutes: 10 }),
          },
          between: () => undefined,
        });
      });

      then('both unlocks exit 0', () => {
        expect(results.first.status).toEqual(0);
        expect(results.second.status).toEqual(0);
      });

      then('the second unlock exports anew, since the cached credentials near their expiry', () => {
        // .note = an unlock asks for the export more than once, and an export inside the margin is
        //   never served from the cache, so each ask exports; the claim is that the second unlock does
        expect(results.countAfterFirst).toBeGreaterThanOrEqual(1);
        expect(results.count).toBeGreaterThan(results.countAfterFirst);
      });
    });

    when('[t1] the cached credentials expire in 20 minutes, past the margin', () => {
      const results = useBeforeAll(async () => {
        setColdStart();
        return unlockTwice({
          env: {
            ...asEnvExportCounted({ home: repo.path }),
            MOCK_AWS_EXPORT_EXPIRATION: asExpirationIn({ minutes: 20 }),
          },
          between: () => undefined,
        });
      });

      then('both unlocks exit 0', () => {
        expect(results.first.status).toEqual(0);
        expect(results.second.status).toEqual(0);
      });

      then('the second unlock reads the cache and exports none', () => {
        expect(results.countAfterFirst).toEqual(1);
        expect(results.count).toEqual(1);
      });
    });

    when('[t2] the profile config changes between the two unlocks', () => {
      const results = useBeforeAll(async () => {
        setColdStart();
        const configPath = `${repo.path}/.aws/config`;
        return unlockTwice({
          env: asEnvExportCounted({ home: repo.path }),
          between: () =>
            writeFileSync(
              configPath,
              readFileSync(configPath, 'utf-8').replace(
                'sso_role_name = AdministratorAccess',
                'sso_role_name = AdministratorAccess\nregion = us-east-1',
              ),
              'utf-8',
            ),
        });
      });

      then('both unlocks exit 0', () => {
        expect(results.first.status).toEqual(0);
        expect(results.second.status).toEqual(0);
      });

      then('the second unlock exports anew, since the cache keys on the config it was exported under', () => {
        expect(results.countAfterFirst).toEqual(1);
        expect(results.count).toEqual(2);
      });
    });
  });
});
