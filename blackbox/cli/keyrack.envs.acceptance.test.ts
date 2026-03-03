import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack envs', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());
  /**
   * [uc9] --env required when env-specific sections exist
   */
  given('[case1] repo with multi-env keyrack.yml (prod + prep)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] unlock without --env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions --env is required', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('--env');
      });

      then('error lists available envs', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('prod');
        expect(output).toContain('prep');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] get --for repo without --env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions --env is required', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('--env');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] get --for repo --json without --env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc3] unlock with --env filter
   * [uc4] get with --env filter
   * [uc7] export preserves raw key names
   */
  given('[case2] repo with multi-env and os.direct vault configured', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    // ensure daemon cache is cleared before each test for consistent vault source
    beforeEach(async () => {
      await invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
    });

    when('[t0] get --for repo --env prep --json (without unlock)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prep', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 2 (locked keys exit non-zero)', () => {
        expect(result.status).toEqual(2);
      });

      then('returns locked status for prep keys + env=all keys (vault keys require unlock)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(Array.isArray(parsed)).toBe(true);
        const locked = parsed.filter(
          (a: { status: string }) => a.status === 'locked',
        );
        // note: 3 locked = 2 prep-specific + 1 env=all (env=all included for specific env queries)
        expect(locked.length).toEqual(3);
      });

      then('does NOT contain prod keys', () => {
        const parsed = JSON.parse(result.stdout);
        const prodAttempts = parsed.filter(
          (a: { slug?: string }) => a.slug?.includes('.prod.'),
        );
        expect(prodAttempts.length).toEqual(0);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t0.5] unlock prep then get --for repo --env prep --json', () => {
      // unlock prep keys into daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prep'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prep', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('returns granted status for prep keys after unlock', () => {
        const parsed = JSON.parse(result.stdout);
        const granted = parsed.filter(
          (a: { status: string }) => a.status === 'granted',
        );
        expect(granted.length).toEqual(2);
      });

      then('contains prep SHARED_API_KEY with prep value', () => {
        const parsed = JSON.parse(result.stdout);
        const attempt = parsed.find(
          (a: { grant?: { slug: string } }) =>
            a.grant?.slug === 'testorg.prep.SHARED_API_KEY',
        );
        expect(attempt).toBeDefined();
        expect(attempt.status).toEqual('granted');
        expect(attempt.grant.key.secret).toEqual('sk-shared-prep-xyz789');
      });

      then('contains prep AWS_PROFILE with prep value', () => {
        const parsed = JSON.parse(result.stdout);
        const attempt = parsed.find(
          (a: { grant?: { slug: string } }) =>
            a.grant?.slug === 'testorg.prep.AWS_PROFILE',
        );
        expect(attempt).toBeDefined();
        expect(attempt.status).toEqual('granted');
        expect(attempt.grant.key.secret).toEqual('testorg.prep');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] get --for repo --env prod --json (without unlock)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prod', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 2 (locked keys exit non-zero)', () => {
        expect(result.status).toEqual(2);
      });

      then('returns locked status for prod keys + env=all keys (vault keys require unlock)', () => {
        const parsed = JSON.parse(result.stdout);
        const locked = parsed.filter(
          (a: { status: string }) => a.status === 'locked',
        );
        // note: 3 locked = 2 prod-specific + 1 env=all (env=all included for specific env queries)
        expect(locked.length).toEqual(3);
      });

      then('does NOT contain prep keys', () => {
        const parsed = JSON.parse(result.stdout);
        const prepAttempts = parsed.filter(
          (a: { slug?: string }) => a.slug?.includes('.prep.'),
        );
        expect(prepAttempts.length).toEqual(0);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1.5] unlock prod then get --for repo --env prod --json', () => {
      // unlock prod keys into daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prod'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prod', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('returns granted status for prod keys after unlock', () => {
        const parsed = JSON.parse(result.stdout);
        const granted = parsed.filter(
          (a: { status: string }) => a.status === 'granted',
        );
        expect(granted.length).toEqual(2);
      });

      then('contains prod SHARED_API_KEY with prod value', () => {
        const parsed = JSON.parse(result.stdout);
        const attempt = parsed.find(
          (a: { grant?: { slug: string } }) =>
            a.grant?.slug === 'testorg.prod.SHARED_API_KEY',
        );
        expect(attempt).toBeDefined();
        expect(attempt.grant.key.secret).toEqual('sk-shared-prod-abc123');
      });

      then('contains prod AWS_PROFILE with prod value', () => {
        const parsed = JSON.parse(result.stdout);
        const attempt = parsed.find(
          (a: { grant?: { slug: string } }) =>
            a.grant?.slug === 'testorg.prod.AWS_PROFILE',
        );
        expect(attempt).toBeDefined();
        expect(attempt.grant.key.secret).toEqual('testorg.prod');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t2] unlock all then get --for repo --env all --json', () => {
      // unlock all keys into daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'all'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'all', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 2 (contains locked key testorg.all.SHARED_API_KEY)', () => {
        expect(result.status).toEqual(2);
      });

      then('returns 4 granted keys (2 per env)', () => {
        const parsed = JSON.parse(result.stdout);
        const granted = parsed.filter(
          (a: { status: string }) => a.status === 'granted',
        );
        expect(granted.length).toEqual(4);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t3] get --for repo --env prep (human readable, without unlock)', () => {
      // relock to clear daemon keys from t2 unlock
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prep'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 2 (locked keys exit non-zero)', () => {
        expect(result.status).toEqual(2);
      });

      then('output contains locked indicator', () => {
        expect(result.stdout).toContain('locked');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc7] export preserves raw key names
   */
  given('[case3] raw key name export via single key get', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    // ensure daemon cache is cleared before each test for consistent vault source
    beforeEach(async () => {
      await invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
    });

    when('[t0] get --key testorg.prep.AWS_PROFILE --json (without unlock)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'testorg.prep.AWS_PROFILE',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is locked (vault key requires unlock)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t0.5] unlock prep then get --key testorg.prep.AWS_PROFILE --json', () => {
      // unlock prep keys into daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prep'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'testorg.prep.AWS_PROFILE',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted after unlock', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('grant.slug contains raw key name AWS_PROFILE', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.slug).toEqual('testorg.prep.AWS_PROFILE');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] get --key testorg.prep.AWS_PROFILE (human readable, without unlock)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.prep.AWS_PROFILE'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('output contains locked and AWS_PROFILE', () => {
        expect(result.stdout).toContain('locked');
        expect(result.stdout).toContain('AWS_PROFILE');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc10] raw key name resolution
   * when user passes just the raw key name (not full slug),
   * keyrack should resolve it based on env context
   */
  given('[case3.5] raw key name resolution with --key', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    // ensure daemon cache is cleared before each test
    beforeEach(async () => {
      await invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
    });

    when('[t0] get --key AWS_PROFILE without --env (defaults to env=all)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'AWS_PROFILE', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 2 (absent keys exit non-zero)', () => {
        expect(result.status).toEqual(2);
      });

      then('status is absent (key not in repo manifest for env=all)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('absent');
      });

      then('fix suggests --env to disambiguate', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('--env');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] get --key AWS_PROFILE --env prep (without unlock)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'AWS_PROFILE', '--env', 'prep', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 2 (locked keys exit non-zero)', () => {
        expect(result.status).toEqual(2);
      });

      then('status is locked (vault key requires unlock)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });
    });

    when('[t1.5] unlock prep then get --key AWS_PROFILE --env prep', () => {
      // unlock prep keys into daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prep'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'AWS_PROFILE', '--env', 'prep', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted after unlock', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('resolves to full slug testorg.prep.AWS_PROFILE', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.slug).toEqual('testorg.prep.AWS_PROFILE');
      });

      then('returns prep value', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('testorg.prep');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t2] unlock prod then get --key SHARED_API_KEY --env prod', () => {
      // unlock prod keys into daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prod'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'SHARED_API_KEY', '--env', 'prod', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('resolves to full slug testorg.prod.SHARED_API_KEY', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.slug).toEqual('testorg.prod.SHARED_API_KEY');
      });

      then('returns prod value', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('sk-shared-prod-abc123');
      });
    });
  });

  /**
   * [uc8] env isolation security
   * os.envvar vault takes precedence, but here we test that
   * env-scoped get only returns keys for the requested env
   */
  given('[case4] env isolation via get --env filter', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    // ensure daemon cache is cleared before each test for consistent vault source
    beforeEach(async () => {
      await invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
    });

    when('[t0] unlock prep then get --for repo --env prep --json', () => {
      // unlock prep keys into daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prep'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prep', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('all returned keys are prep-scoped', () => {
        const parsed = JSON.parse(result.stdout);
        for (const attempt of parsed) {
          if (attempt.grant) {
            expect(attempt.grant.slug).toContain('.prep.');
          }
        }
      });

      then('no prod keys leak into prep response', () => {
        const raw = result.stdout;
        expect(raw).not.toContain('"testorg.prod.');
      });
    });
  });

  /**
   * [uc12] set+get roundtrip journey with os.secure vault
   * critical path: set a key, then get it back
   */
  given('[case4.5] set+get roundtrip with os.secure vault', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    // ensure daemon cache is cleared before test
    beforeAll(async () => {
      await invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
    });

    when('[t0] set NEW_ROUNDTRIP_KEY to os.secure, then get it back', () => {
      // set the key
      const setResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'NEW_ROUNDTRIP_KEY',
            '--env',
            'test',
            '--mech',
            'REPLICA',
            '--vault',
            'os.secure',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'roundtrip-secure-value-123\n',
        }),
      );

      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });

      then('set returns configured host', () => {
        const parsed = JSON.parse(setResult.stdout);
        expect(parsed.slug).toEqual('testorg.test.NEW_ROUNDTRIP_KEY');
        expect(parsed.vault).toEqual('os.secure');
      });
    });

    when('[t1] get NEW_ROUNDTRIP_KEY after set (without unlock)', () => {
      // first set the key
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'KEY_FOR_LOCKED_TEST',
            '--env',
            'test',
            '--mech',
            'REPLICA',
            '--vault',
            'os.secure',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'locked-test-value-456\n',
        }),
      );

      // relock to clear daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      const getResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.KEY_FOR_LOCKED_TEST', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('get returns locked status (vault not unlocked)', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.status).toEqual('locked');
      });

      then('fix mentions unlock', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.fix).toContain('unlock');
      });
    });

    when('[t2] unlock then get SECURE_API_KEY (full roundtrip)', () => {
      // unlock keys into daemon first
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const getResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('get exits with status 0', () => {
        expect(getResult.status).toEqual(0);
      });

      then('status is granted after unlock', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value matches stored value', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.grant.key.secret).toEqual('portable-secure-value-xyz789');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t3] unlock then get SECURE_API_KEY via raw key name with --env test', () => {
      // unlock keys into daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const getResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'SECURE_API_KEY', '--env', 'test', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('get exits with status 0', () => {
        expect(getResult.status).toEqual(0);
      });

      then('status is granted after unlock', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('resolves to full slug testorg.test.SECURE_API_KEY', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.grant.slug).toEqual('testorg.test.SECURE_API_KEY');
      });

      then('value is correct', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.grant.key.secret).toEqual('portable-secure-value-xyz789');
      });
    });
  });

  /**
   * [uc3] unlock with --env filter
   */
  given('[case5] unlock with env filter', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] unlock --env prep', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prep'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output mentions prep', () => {
        const output = result.stdout + result.stderr;
        expect(output.toLowerCase()).toContain('prep');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] unlock --env all', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'all'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc5] set with --org mismatch
   */
  given('[case6] set with org mismatch', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] set --key AWS_PROFILE --org foreign-org --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'AWS_PROFILE',
            '--org',
            'foreign-org',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions org mismatch', () => {
        const output = result.stdout + result.stderr;
        expect(output.toLowerCase()).toContain('org');
        expect(output).toContain('foreign-org');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] set --key AWS_PROFILE --org @this (valid match)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'AWS_PROFILE',
            '--org',
            '@this',
            '--env',
            'prod',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'test-aws-profile-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        if (parsed.createdAt) parsed.createdAt = '__TIMESTAMP__';
        if (parsed.updatedAt) parsed.updatedAt = '__TIMESTAMP__';
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc11] flat keys: format rejection
   */
  given('[case7] repo with old flat keys: format', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-flat-keys' }),
    );

    when('[t0] get --for repo --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions keys: format is not supported', () => {
        const output = result.stdout + result.stderr;
        expect(output.toLowerCase()).toMatch(/keys|format|supported|invalid/);
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc13] env=all is per-org scoped
   * keys set with env=all for orgA should NOT appear for orgB
   */
  given('[case8] env=all org scope', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    // ensure daemon cache is cleared before each test
    beforeEach(async () => {
      await invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
    });

    when('[t0] set key for testorg.all', () => {
      // set a key with env=all for testorg
      const setResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'ORG_SCOPED_TOKEN',
            '--org',
            '@this',
            '--env',
            'all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'testorg-all-value-123\n',
        }),
      );

      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });

      then('set creates testorg.all.ORG_SCOPED_TOKEN', () => {
        const parsed = JSON.parse(setResult.stdout);
        expect(parsed.slug).toEqual('testorg.all.ORG_SCOPED_TOKEN');
      });
    });

    when('[t1] get --for repo --env prod returns testorg.all keys', () => {
      // first set the key
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'ORG_SCOPED_TOKEN',
            '--org',
            '@this',
            '--env',
            'all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'testorg-all-value-123\n',
        }),
      );

      // unlock all keys
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'all'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prod', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('includes testorg.all.ORG_SCOPED_TOKEN in prod results', () => {
        const parsed = JSON.parse(result.stdout);
        const allKey = parsed.find(
          (a: { grant?: { slug: string } }) =>
            a.grant?.slug === 'testorg.all.ORG_SCOPED_TOKEN',
        );
        expect(allKey).toBeDefined();
        expect(allKey.grant.key.secret).toEqual('testorg-all-value-123');
      });
    });

    when('[t2] otherorg keys do NOT appear in testorg query (org isolation)', () => {
      // create a second repo with org: otherorg (but SAME HOME as testorg for shared daemon)
      const otherorgRepo = useBeforeAll(async () => {
        const otherRepo = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
        // overwrite keyrack.yml with org: otherorg
        const fs = await import('fs/promises');
        const path = await import('path');
        await fs.writeFile(
          path.join(otherRepo.path, '.agent', 'keyrack.yml'),
          'org: otherorg\n\nenv.all:\n  - OTHERORG_TOKEN\n\nenv.prod:\n  - OTHERORG_PROD_KEY\n',
        );
        return otherRepo;
      });

      // set key for otherorg with env=all (SAME HOME as testorg for shared daemon)
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'OTHERORG_TOKEN',
            '--org',
            '@this',
            '--env',
            'all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: otherorgRepo.path,
          env: { HOME: repo.path }, // shared HOME for daemon
          stdin: 'otherorg-secret-value\n',
        }),
      );

      // unlock otherorg keys (so they're in daemon, shared HOME)
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'all'],
          cwd: otherorgRepo.path,
          env: { HOME: repo.path }, // shared HOME for daemon
        }),
      );

      // set key for testorg with env=all (shared HOME)
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'TESTORG_ONLY_TOKEN',
            '--org',
            '@this',
            '--env',
            'all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path }, // shared HOME for daemon
          stdin: 'testorg-only-value-456\n',
        }),
      );

      // unlock testorg keys (shared HOME)
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'all'],
          cwd: repo.path,
          env: { HOME: repo.path }, // shared HOME for daemon
        }),
      );

      // query from testorg repo (shared HOME — daemon has both orgs' keys)
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prod', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path }, // shared HOME for daemon
        }),
      );

      then('testorg.all.TESTORG_ONLY_TOKEN is in results (positive)', () => {
        const parsed = JSON.parse(result.stdout);
        const testorgKey = parsed.find(
          (a: { grant?: { slug: string }; slug?: string }) =>
            (a.grant?.slug ?? a.slug) === 'testorg.all.TESTORG_ONLY_TOKEN',
        );
        expect(testorgKey).toBeDefined();
      });

      then('otherorg.all.OTHERORG_TOKEN does NOT appear (negative - org isolation)', () => {
        const parsed = JSON.parse(result.stdout);
        const otherOrgKeys = parsed.filter(
          (a: { grant?: { slug: string }; slug?: string }) =>
            (a.grant?.slug ?? a.slug)?.startsWith('otherorg.'),
        );
        expect(otherOrgKeys.length).toEqual(0);
      });

      then('only testorg.* keys appear', () => {
        const parsed = JSON.parse(result.stdout);
        for (const attempt of parsed) {
          const slug = attempt.grant?.slug ?? attempt.slug;
          expect(slug).toMatch(/^testorg\./);
        }
      });
    });
  });

  /**
   * [uc6] list with env awareness
   */
  given('[case9] list with multi-env repo', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] keyrack list', () => {
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

      then('output contains both prod and prep keys', () => {
        expect(result.stdout).toContain('AWS_PROFILE');
        expect(result.stdout).toContain('SHARED_API_KEY');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list --json', () => {
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

      then('json contains prod and prep hosts', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.prod.AWS_PROFILE']).toBeDefined();
        expect(parsed['testorg.prep.AWS_PROFILE']).toBeDefined();
        expect(parsed['testorg.prod.SHARED_API_KEY']).toBeDefined();
        expect(parsed['testorg.prep.SHARED_API_KEY']).toBeDefined();
      });
    });
  });

  /**
   * [uc14] env=all is per-owner scoped
   * keys set with env=all by ownerA should NOT appear for ownerB
   *
   * note: org comes from repo's keyrack.yml (testorg), not from owner
   * owner isolation = each owner has separate host manifest at ~/.rhachet/keyrack/owner=$owner/
   */
  given('[case10] env=all owner scope', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    // init mechanic owner
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--for', 'mechanic'],
        cwd: repo.path,
        env: { HOME: repo.path },
      }),
    );

    // init foreman owner
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--for', 'foreman'],
        cwd: repo.path,
        env: { HOME: repo.path },
      }),
    );

    // ensure daemon cache is cleared before each test
    beforeEach(async () => {
      await invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
    });

    when('[t0] set key for mechanic with env=all', () => {
      const setResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'OWNER_SCOPED_TOKEN',
            '--for',
            'mechanic',
            '--env',
            'all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'mechanic-secret-123\n',
        }),
      );

      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });

      then('set creates testorg.all.OWNER_SCOPED_TOKEN (org from repo)', () => {
        const parsed = JSON.parse(setResult.stdout);
        // org is testorg (from keyrack.yml), owner is mechanic (from --for)
        expect(parsed.slug).toEqual('testorg.all.OWNER_SCOPED_TOKEN');
      });
    });

    when('[t1] mechanic can access their env=all key (positive)', () => {
      // set key for mechanic
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'OWNER_SCOPED_TOKEN',
            '--for',
            'mechanic',
            '--env',
            'all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'mechanic-secret-123\n',
        }),
      );

      // unlock mechanic keys
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--for', 'mechanic', '--env', 'all'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'testorg.all.OWNER_SCOPED_TOKEN',
            '--owner',
            'mechanic',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('testorg.all.OWNER_SCOPED_TOKEN is granted for mechanic', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
        expect(parsed.grant.slug).toEqual('testorg.all.OWNER_SCOPED_TOKEN');
        expect(parsed.grant.key.secret).toEqual('mechanic-secret-123');
      });
    });

    when('[t2] foreman cannot access mechanic env=all key (negative)', () => {
      // set key for mechanic
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'MECHANIC_ONLY_TOKEN',
            '--for',
            'mechanic',
            '--env',
            'all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'mechanic-only-value-456\n',
        }),
      );

      // unlock foreman keys (not mechanic)
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--for', 'foreman', '--env', 'all'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'testorg.all.MECHANIC_ONLY_TOKEN',
            '--owner',
            'foreman',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('mechanic key is NOT granted to foreman (owner isolation)', () => {
        const parsed = JSON.parse(result.stdout);
        // key should be locked or absent since foreman's host manifest doesn't have it
        expect(parsed.status).not.toEqual('granted');
      });

      then('mechanic secret is NOT exposed', () => {
        expect(result.stdout).not.toContain('mechanic-only-value-456');
      });
    });

    when('[t3] list shows only own owner keys (negative)', () => {
      // set key for mechanic
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'MECHANIC_LIST_TOKEN',
            '--for',
            'mechanic',
            '--env',
            'all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'mechanic-list-value\n',
        }),
      );

      // set key for foreman
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'FOREMAN_LIST_TOKEN',
            '--for',
            'foreman',
            '--env',
            'all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'foreman-list-value\n',
        }),
      );

      const mechanicList = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--for', 'mechanic', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const foremanList = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--for', 'foreman', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('mechanic list contains testorg.all.MECHANIC_LIST_TOKEN', () => {
        const parsed = JSON.parse(mechanicList.stdout);
        expect(parsed['testorg.all.MECHANIC_LIST_TOKEN']).toBeDefined();
      });

      then('mechanic list does NOT contain testorg.all.FOREMAN_LIST_TOKEN', () => {
        const parsed = JSON.parse(mechanicList.stdout);
        expect(parsed['testorg.all.FOREMAN_LIST_TOKEN']).toBeUndefined();
      });

      then('foreman list contains testorg.all.FOREMAN_LIST_TOKEN', () => {
        const parsed = JSON.parse(foremanList.stdout);
        expect(parsed['testorg.all.FOREMAN_LIST_TOKEN']).toBeDefined();
      });

      then('foreman list does NOT contain testorg.all.MECHANIC_LIST_TOKEN', () => {
        const parsed = JSON.parse(foremanList.stdout);
        expect(parsed['testorg.all.MECHANIC_LIST_TOKEN']).toBeUndefined();
      });
    });
  });
});
