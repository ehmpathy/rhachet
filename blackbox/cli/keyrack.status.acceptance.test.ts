import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import {
  genTestTempRepo,
  TEST_SSH_AGE_RECIPIENT,
} from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = path to mock aws CLI executable
 * .why = placed on PATH ahead of real aws CLI for aws.config vault tests
 */
const MOCK_AWS_CLI_DIR = resolve(__dirname, '../.test/assets/mock-aws-cli');

/**
 * .what = env vars with mock aws CLI on PATH
 * .why = acceptance tests must be fully portable without real AWS credentials
 */
const envWithMockAws = (home: string) => ({
  HOME: home,
  PATH: `${MOCK_AWS_CLI_DIR}:${process.env.PATH}`,
});

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

/**
 * .what = tests locked vs absent status distinction
 * .why = users need clear guidance on whether to set or unlock
 *
 * .note = "absent" means key was never set (no vault file)
 * .note = "locked" means key was set but daemon needs unlock
 */
describe('keyrack status: locked vs absent', () => {
  // kill any stale daemon to ensure fresh code is used
  beforeAll(() => {
    killKeyrackDaemonForTests({ owner: null });
  });

  /**
   * [uc1] absent: key was never set
   * get returns absent with guidance to set first
   */
  given('[case1] key was never set (truly absent)', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });
      // init keyrack so we have encrypted manifest and recipients
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] get --key NONEXISTENT_KEY --env sudo --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'NONEXISTENT_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is absent', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('absent');
      });

      then('message guides user to set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.message).toContain('does not exist');
        expect(parsed.message).toContain('set it first');
      });

      then('fix contains set command', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('set');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc2] locked: key was set but needs unlock
   * get returns locked with guidance to unlock first
   */
  given('[case2] key was set but not unlocked (locked)', () => {
    // kill daemon to ensure clean state
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });
      // init keyrack
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    // set the key first (creates vault file) - use sudo env to bypass keyrack.yml requirement
    const setResult = useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'LOCKED_KEY',
          '--env',
          'sudo',
          '--vault',
          'os.secure',
          '--mech',
          'PERMANENT_VIA_REPLICA',
          '--vault-recipient',
          TEST_SSH_AGE_RECIPIENT,
          '--org',
          '@all',
          '--json',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'locked-secret-value\n',
      }),
    );

    when('[t0] set creates the key', () => {
      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });

      then('set stdout matches snapshot', () => {
        const parsed = JSON.parse(setResult.stdout);
        const snapped = Array.isArray(parsed)
          ? parsed.map((e: Record<string, unknown>) => ({
              ...e,
              createdAt: '__TIMESTAMP__',
              updatedAt: '__TIMESTAMP__',
            }))
          : { ...parsed, createdAt: '__TIMESTAMP__', updatedAt: '__TIMESTAMP__' };
        expect(snapped).toMatchSnapshot();
      });
    });

    when('[t1] get --key LOCKED_KEY --env sudo --json (after set, before unlock)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'LOCKED_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked (not absent)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });

      then('message guides user to unlock', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.message).toContain('locked');
        expect(parsed.message).toContain('unlock it first');
      });

      then('fix contains unlock command', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('unlock');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc3] set invalidates daemon cache (relock on set)
   * ensures stale values are not returned after set overwrites
   */
  given('[case3] set invalidates daemon cache (relock)', () => {
    // kill daemon to ensure clean state
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });
      // init keyrack
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    // set initial value - use sudo env to bypass keyrack.yml requirement
    const initialSetResult = useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'RELOCK_TEST_KEY',
          '--env',
          'sudo',
          '--vault',
          'os.secure',
          '--mech',
          'PERMANENT_VIA_REPLICA',
          '--vault-recipient',
          TEST_SSH_AGE_RECIPIENT,
          '--org',
          '@all',
          '--json',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'initial-value\n',
      }),
    );

    // unlock to cache initial value in daemon
    const initialUnlockResult = useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'unlock',
          '--env',
          'sudo',
          '--key',
          'RELOCK_TEST_KEY',
          '--json',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
      }),
    );

    when('[t-setup] initial set and unlock', () => {
      then('initial set stdout matches snapshot', () => {
        const parsed = JSON.parse(initialSetResult.stdout);
        const snapped = Array.isArray(parsed)
          ? parsed.map((e: Record<string, unknown>) => ({
              ...e,
              createdAt: '__TIMESTAMP__',
              updatedAt: '__TIMESTAMP__',
            }))
          : { ...parsed, createdAt: '__TIMESTAMP__', updatedAt: '__TIMESTAMP__' };
        expect(snapped).toMatchSnapshot();
      });

      then('initial unlock stdout matches snapshot', () => {
        const parsed = JSON.parse(initialUnlockResult.stdout);
        expect(asUnlockSnapshotSafe(parsed)).toMatchSnapshot();
      });
    });

    when('[t0] get returns initial value from daemon', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'RELOCK_TEST_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value is initial-value', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('initial-value');
      });
    });

    when('[t1] set overwrites with new value', () => {
      const setResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'RELOCK_TEST_KEY',
            '--env',
            'sudo',
            '--vault',
            'os.secure',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault-recipient',
            TEST_SSH_AGE_RECIPIENT,
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'updated-value\n',
        }),
      );

      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });

      then('set stdout matches snapshot', () => {
        const parsed = JSON.parse(setResult.stdout);
        const snapped = Array.isArray(parsed)
          ? parsed.map((e: Record<string, unknown>) => ({
              ...e,
              createdAt: '__TIMESTAMP__',
              updatedAt: '__TIMESTAMP__',
            }))
          : { ...parsed, createdAt: '__TIMESTAMP__', updatedAt: '__TIMESTAMP__' };
        expect(snapped).toMatchSnapshot();
      });
    });

    when('[t2] get after set returns locked (not stale value)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'RELOCK_TEST_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked (daemon cache was invalidated)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });

      then('does NOT return stale value', () => {
        expect(result.stdout).not.toContain('initial-value');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t3] unlock then get returns updated value', () => {
      const unlockResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'sudo',
            '--key',
            'RELOCK_TEST_KEY',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('unlock stdout matches snapshot', () => {
        const parsed = JSON.parse(unlockResult.stdout);
        expect(asUnlockSnapshotSafe(parsed)).toMatchSnapshot();
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'RELOCK_TEST_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value is updated-value', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('updated-value');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc4] aws.config vault: status journey
   *
   * .note = aws.config vault cannot be checked for locked vs absent status
   * .note = profile name (exid) is stored in encrypted host manifest
   * .note = without manifest decrypt, aws.config keys show 'absent' until unlocked
   */
  given('[case4] aws.config vault status journey', () => {
    // ensure mock aws executable is chmod +x
    beforeAll(() => chmodSync(`${MOCK_AWS_CLI_DIR}/aws`, 0o755));
    // cleanup daemon between tests
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      // keyrack init
      await invokeRhachetCliBinary({
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

      // pre-populate ~/.aws/config with a profile
      const awsDir = `${r.path}/.aws`;
      mkdirSync(awsDir, { recursive: true });
      writeFileSync(
        `${awsDir}/config`,
        [
          '[profile testorg-test]',
          'sso_session = mock-portal',
          'sso_account_id = 123456789012',
          'sso_role_name = AdministratorAccess',
          'region = us-east-1',
          '',
          '[sso-session mock-portal]',
          'sso_start_url = https://mock-portal.awsapps.com/start',
          'sso_region = us-east-1',
          '',
        ].join('\n'),
        'utf-8',
      );

      return r;
    });

    when('[t0] get before set → absent (inventory-only)', () => {
      // .note = profile testorg-test exists in ~/.aws/config (pre-populated fixture)
      // .note = but inventory entry does not exist yet (no keyrack set)
      // .note = inventory-only design: absent because not stocked, regardless of ~/.aws/config
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.AWS_PROFILE', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is absent (no inventory entry, even if profile exists in ~/.aws/config)', () => {
        const parsed = JSON.parse(result.stdout);
        // .note = vision: "profile in config but not stocked → absent (correct)"
        // .note = user needs to run set to register the key with keyrack
        expect(parsed.status).toEqual('absent');
      });

      then('fix suggests set (not unlock)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('set');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t0.1] get before set (human readable)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.AWS_PROFILE'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('output shows absent status with emoji', () => {
        expect(result.stdout).toContain('absent');
      });

      then('output suggests set command', () => {
        expect(result.stdout).toContain('set');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] after set → locked (inventory records key)', () => {
      // set the key
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

      then('set stdout matches snapshot', () => {
        const parsed = JSON.parse(setResult.stdout);
        const snapped = Array.isArray(parsed)
          ? parsed.map((e: Record<string, unknown>) => ({
              ...e,
              createdAt: '__TIMESTAMP__',
              updatedAt: '__TIMESTAMP__',
            }))
          : { ...parsed, createdAt: '__TIMESTAMP__', updatedAt: '__TIMESTAMP__' };
        expect(snapped).toMatchSnapshot();
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.AWS_PROFILE', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked (inventory records the key)', () => {
        const parsed = JSON.parse(result.stdout);
        // .note = inventory is vault-agnostic source of truth
        // .note = after set, inventory entry exists → status is 'locked'
        expect(parsed.status).toEqual('locked');
      });

      then('fix suggests unlock', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('unlock');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1.1] after set (human readable)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.AWS_PROFILE'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('output shows locked status with emoji', () => {
        // .note = inventory records the key → status is 'locked'
        expect(result.stdout).toContain('locked');
      });

      then('output suggests unlock command', () => {
        expect(result.stdout).toContain('unlock');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] after unlock → granted', () => {
      // unlock
      const unlockResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'test',
            '--key',
            'AWS_PROFILE',
            '--json',
          ],
          cwd: repo.path,
          env: envWithMockAws(repo.path),
        }),
      );

      then('unlock stdout matches snapshot', () => {
        const parsed = JSON.parse(unlockResult.stdout);
        expect(asUnlockSnapshotSafe(parsed)).toMatchSnapshot();
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.AWS_PROFILE', '--json'],
          cwd: repo.path,
          env: envWithMockAws(repo.path),
        }),
      );

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value is the profile name', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('testorg-test');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t3] after relock → locked (inventory persists)', () => {
      // relock
      const relockResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('relock stdout matches snapshot', () => {
        const parsed = JSON.parse(relockResult.stdout);
        expect(parsed).toMatchSnapshot();
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.AWS_PROFILE', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked (inventory still exists)', () => {
        const parsed = JSON.parse(result.stdout);
        // .note = inventory persists across relock → status is 'locked'
        expect(parsed.status).toEqual('locked');
      });

      then('fix suggests unlock', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('unlock');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t4] after del → absent', () => {
      // del
      const delResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'del', '--key', 'testorg.test.AWS_PROFILE', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('del stdout matches snapshot', () => {
        const parsed = JSON.parse(delResult.stdout);
        expect(parsed).toMatchSnapshot();
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.AWS_PROFILE', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is absent (inventory removed)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('absent');
      });

      then('fix suggests set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('set');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc5] profile added externally (not via keyrack)
   * keyrack only tracks keys it manages — external profiles show absent
   */
  given('[case5] AWS profile added externally shows absent', () => {
    beforeAll(() => chmodSync(`${MOCK_AWS_CLI_DIR}/aws`, 0o755));
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      // keyrack init
      await invokeRhachetCliBinary({
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

      // pre-populate ~/.aws/config with a profile (external to keyrack)
      const awsDir = `${r.path}/.aws`;
      mkdirSync(awsDir, { recursive: true });
      writeFileSync(
        `${awsDir}/config`,
        [
          '[profile external-profile]',
          'sso_session = external-portal',
          'sso_account_id = 111111111111',
          'sso_role_name = ReadOnly',
          'region = us-west-2',
          '',
          '[sso-session external-portal]',
          'sso_start_url = https://external.awsapps.com/start',
          'sso_region = us-west-2',
          '',
        ].join('\n'),
        'utf-8',
      );

      return r;
    });

    when('[t0] get for profile added externally', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.AWS_PROFILE', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is absent (not tracked by keyrack)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('absent');
      });

      then('fix suggests set to adopt under keyrack management', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('set');
      });
    });
  });

  /**
   * [uc6] orphan inventory recovery
   * when inventory exists but vault entry was externally deleted,
   * unlock should report key as "lost" in omitted list
   *
   * .note = uses os.secure vault instead of aws.config because:
   * - os.secure vault returns null when vault file is deleted
   * - aws.config vault validation happens via aws CLI (mock always succeeds)
   * - both vaults exercise the same "lost" code path in unlockKeyrackKeys.ts
   */
  given('[case6] orphan inventory (vault deleted externally)', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      // keyrack init
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      // write repo manifest with ORPHAN_SECRET key
      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - ORPHAN_SECRET\n',
        'utf-8',
      );

      // set key via keyrack (creates inventory entry AND vault file)
      const setResult = await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'ORPHAN_SECRET',
          '--env',
          'test',
          '--vault',
          'os.secure',
          '--mech',
          'PERMANENT_VIA_REPLICA',
          '--vault-recipient',
          TEST_SSH_AGE_RECIPIENT,
          '--json',
        ],
        cwd: r.path,
        env: { HOME: r.path },
        stdin: 'secret-value-before-deletion\n',
      });

      // verify set succeeded (exit code 0)
      expect(setResult.status).toEqual(0);

      // find and delete the vault file (simulate external deletion)
      // os.secure stores secrets at ~/.rhachet/keyrack/vault/os.secure/owner=default/{hash}.age
      const vaultDir = `${r.path}/.rhachet/keyrack/vault/os.secure/owner=default`;
      if (existsSync(vaultDir)) {
        const files = readdirSync(vaultDir);
        for (const file of files) {
          if (file.endsWith('.age')) {
            unlinkSync(`${vaultDir}/${file}`);
          }
        }
      }

      return r;
    });

    when('[t0] get status for orphan key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.ORPHAN_SECRET', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked (inventory exists, vault absent)', () => {
        const parsed = JSON.parse(result.stdout);
        // .note = inventory is checked first (vault-agnostic)
        // .note = inventory exists → status is 'locked'
        // .note = vault file deletion is detected on unlock attempt (reason: lost)
        expect(parsed.status).toEqual('locked');
      });

      then('fix suggests unlock', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('unlock');
      });
    });

    when('[t1] unlock reports lost key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'test',
            '--key',
            'ORPHAN_SECRET',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('omitted includes key with reason lost', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.omitted).toContainEqual({
          slug: 'testorg.test.ORPHAN_SECRET',
          reason: 'lost',
        });
      });

      then('unlocked is empty', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.unlocked).toEqual([]);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });
});
