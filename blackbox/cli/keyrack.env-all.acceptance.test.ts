import { given, then, useBeforeAll, when } from 'test-fns';

import {
  genTestTempRepo,
  TEST_SSH_AGE_RECIPIENT,
} from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = env=all roundtrip behavior tests
 * .why = validates that env=all acts as universal credential
 *
 * .ref = .agent/repo=.this/role=keyrack/briefs/spec.env-all-roundtrip-behavior.md
 */
describe('keyrack env=all roundtrip', () => {
  // kill any stale daemon to ensure fresh code is used
  beforeAll(() => {
    killKeyrackDaemonForTests({ owner: null });
  });

  /**
   * [uc1] set defaults to env=all
   */
  given('[case1] set without --env defaults to env=all', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set --key without --env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'ALL_ENV_KEY',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'all-env-secret-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('env defaults to all', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.env).toEqual('all');
      });

      then('slug contains .all.', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toContain('.all.');
      });
    });
  });

  /**
   * [uc2] env=all key satisfies specific env get request (fallback)
   */
  given('[case2] env=all is fallback for specific envs', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set key with env=all', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'UNIVERSAL_KEY',
            '--env',
            'all',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'universal-secret-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('key is set for env=all', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.env).toEqual('all');
        expect(parsed.slug).toContain('.all.');
      });
    });

    when('[t1] unlock key with --env test (fallback to env=all)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'UNIVERSAL_KEY'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output shows env=all key (fallback found)', () => {
        expect(result.stdout).toContain('.all.');
        expect(result.stdout).toContain('UNIVERSAL_KEY');
      });
    });

    when('[t2] get key with --env test (after unlock fallback)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'UNIVERSAL_KEY',
            '--env',
            'test',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('slug shows env=all (fallback source)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.slug).toContain('.all.');
      });

      then('value matches what was set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('universal-secret-value');
      });
    });

    when('[t3] unlock key with --env prod (fallback to env=all)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prod', '--key', 'UNIVERSAL_KEY'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output shows env=all key (fallback found)', () => {
        expect(result.stdout).toContain('.all.');
        expect(result.stdout).toContain('UNIVERSAL_KEY');
      });
    });

    when('[t4] get key with --env prod (after unlock fallback)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'UNIVERSAL_KEY',
            '--env',
            'prod',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('slug shows env=all', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.slug).toContain('.all.');
      });
    });
  });

  /**
   * [uc3] specific env takes precedence over env=all
   */
  given('[case3] specific env takes precedence over env=all', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set key with env=all', () => {
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'MIXED_KEY',
            '--env',
            'all',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'all-env-value\n',
        }),
      );

      then('env=all key is set', () => {
        // implicit - no assertion needed, setup for next step
        expect(true).toBe(true);
      });
    });

    when('[t1] set same key with env=test (specific)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'MIXED_KEY',
            '--env',
            'test',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'test-specific-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('key is set for env=test', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.env).toEqual('test');
        expect(parsed.slug).toContain('.test.');
      });
    });

    when('[t2] unlock both keys', () => {
      const unlockResults = useBeforeAll(async () => {
        const allResult = await invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'all', '--key', 'MIXED_KEY'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        const testResult = await invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'MIXED_KEY'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        return { allResult, testResult };
      });

      then('both keys are unlocked', () => {
        expect(unlockResults.allResult.status).toEqual(0);
        expect(unlockResults.testResult.status).toEqual(0);
      });
    });

    when('[t3] get key with --env test', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'MIXED_KEY',
            '--env',
            'test',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('uses specific env=test key (not env=all)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.slug).toContain('.test.');
        expect(parsed.grant.slug).not.toContain('.all.');
      });

      then('value is from env=test key', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('test-specific-value');
      });
    });

    when('[t4] unlock key with --env prod (falls back to env=all)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prod', '--key', 'MIXED_KEY'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output shows env=all key (fallback found)', () => {
        expect(result.stdout).toContain('.all.');
        expect(result.stdout).toContain('MIXED_KEY');
      });
    });

    when('[t5] get key with --env prod (after unlock fallback)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'MIXED_KEY',
            '--env',
            'prod',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('uses env=all key (fallback)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.slug).toContain('.all.');
      });

      then('value is from env=all key', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('all-env-value');
      });
    });
  });

  /**
   * [uc4] unlock without --env fails (--env is always required)
   */
  given('[case4] unlock without --env fails', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set key without --env (defaults to all)', () => {
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'DEFAULT_ALL_KEY',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'default-all-value\n',
        }),
      );

      then('key is set', () => {
        expect(true).toBe(true);
      });
    });

    when('[t1] unlock without --env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--key', 'DEFAULT_ALL_KEY'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error indicates --env is required', () => {
        expect(result.stderr + result.stdout).toContain('--env');
      });
    });

    when('[t2] unlock with --env test (fallback to env=all)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'DEFAULT_ALL_KEY'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('unlocks the env=all key via fallback', () => {
        expect(result.stdout).toContain('.all.');
        expect(result.stdout).toContain('DEFAULT_ALL_KEY');
      });
    });

    when('[t3] get with --env test (key was found via fallback at unlock)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'DEFAULT_ALL_KEY',
            '--env',
            'test',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value matches', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('default-all-value');
      });
    });
  });

  /**
   * [uc5] error: key absent for both specific env and env=all
   */
  given('[case5] error when key absent for both envs', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] get key that does not exist', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'NONEXISTENT_KEY',
            '--env',
            'test',
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

      then('fix suggests keyrack set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('keyrack set');
      });
    });

    when('[t1] unlock key that does not exist (negative)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--key',
            'NONEXISTENT_KEY',
            '--env',
            'test',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('output mentions absent or not found', () => {
        const output = result.stdout + result.stderr;
        expect(output.toLowerCase()).toMatch(/absent|not found|does not exist/);
      });

      then('fix suggests keyrack set', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('set');
      });
    });
  });

  /**
   * [uc6] get returns absent when env=all key exists but env=test does not
   *
   * .note = get does NOT do fallback (per spec.key-get-behavior.md)
   *         - env=all key exists but env=test key does not
   *         - get --env test returns "absent" (not "locked")
   *         - user must unlock --env test (which DOES fallback) first
   */
  given('[case6] get returns absent when only env=all exists (get no fallback)', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set key with env=all', () => {
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'LOCKED_KEY',
            '--env',
            'all',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'locked-key-value\n',
        }),
      );

      then('key is set', () => {
        expect(true).toBe(true);
      });
    });

    when('[t1] get with --env test (no fallback to env=all)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'LOCKED_KEY',
            '--env',
            'test',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is absent (get does not fallback to env=all)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('absent');
      });

      then('fix suggests keyrack set (because env=test key is absent)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('set');
      });
    });
  });

  /**
   * [uc7] get returns env=all key for any env via daemon fallback
   *
   * .note = daemon stores env=all key under its true slug (org.all.KEY)
   *         - unlock --env prod finds env=all via fallback, stores as org.all.KEY
   *         - get --env test also finds org.all.KEY via daemon fallback
   *         - env=all is universal: once unlocked, available for any env
   *
   * .ref = rule.require.lookup-time-fallback: fallback at lookup, not storage
   */
  given('[case7] get returns env=all key for any env via daemon fallback', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set key with env=all', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'CROSS_ENV_KEY',
            '--env',
            'all',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'cross-env-secret\n',
        }),
      );

      then('key is set for env=all', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.env).toEqual('all');
      });
    });

    when('[t1] unlock key with --env prod (fallback to env=all)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prod', '--key', 'CROSS_ENV_KEY'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output shows env=all key (fallback found)', () => {
        expect(result.stdout).toContain('.all.');
      });
    });

    when('[t2] get key with --env prod (after unlock for prod)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'CROSS_ENV_KEY',
            '--env',
            'prod',
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

      then('value matches what was set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('cross-env-secret');
      });
    });

    when('[t3] get key with --env test (daemon fallback finds env=all)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'CROSS_ENV_KEY',
            '--env',
            'test',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted (daemon fallback finds env=all key)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('returns the env=all grant', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('cross-env-secret');
      });

      then('slug shows env=all (true identity)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.slug).toContain('.all.');
      });
    });
  });
});
