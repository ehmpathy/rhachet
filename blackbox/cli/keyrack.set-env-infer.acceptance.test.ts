import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = tests set --env inference behavior
 * .why = validates that set infers env from manifest when unambiguous
 *
 * .ref = .agent/repo=.this/role=keyrack/briefs/spec.key-set-behavior.md
 */
describe('keyrack set env inference', () => {
  // kill any stale daemon to ensure fresh code is used
  beforeAll(() => {
    killKeyrackDaemonForTests({ owner: null });
  });

  /**
   * [uc1] infer env when key in one env only
   *
   * .ref = spec.key-set-behavior.md usecase.1
   *        "when key appears in exactly one env, infer that env"
   */
  given('[case1] set infers env when key in one env only', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set --key SHARED_API_KEY without --env (key in env.all only)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'SHARED_API_KEY',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'shared-api-key-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('env is inferred as all (key in env.all only)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.env).toEqual('all');
        expect(parsed.slug).toContain('.all.');
      });
    });
  });

  /**
   * [uc2] fail-fast when key in multiple envs (ambiguous)
   *
   * .ref = spec.key-set-behavior.md usecase.3
   *        "when key in multiple envs, fail-fast and require --env"
   */
  given('[case2] set fails when key in multiple envs (negative)', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set --key AWS_PROFILE without --env (key in prod + prep)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'AWS_PROFILE',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'aws-profile-value\n',
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions multiple envs', () => {
        const output = result.stdout + result.stderr;
        expect(output.toLowerCase()).toMatch(/multiple|ambiguous/);
      });

      then('error tells user to specify --env', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('--env');
      });

      then('error lists which envs the key appears in', () => {
        const output = result.stdout + result.stderr;
        // key is in env.prod and env.prep
        expect(output).toMatch(/prod|prep/);
      });
    });

    when('[t1] set --key AWS_PROFILE with explicit --env prod (works)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'AWS_PROFILE',
            '--env',
            'prod',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'aws-profile-prod-value\n',
        }),
      );

      then('exits with status 0 (explicit --env works)', () => {
        expect(result.status).toEqual(0);
      });

      then('env is prod as specified', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.env).toEqual('prod');
        expect(parsed.slug).toContain('.prod.');
      });
    });
  });

  /**
   * [uc3] fail-fast when key not in manifest (unknown key)
   *
   * .ref = spec.key-set-behavior.md usecase.4
   *        "when key not in manifest, fail-fast and require --env"
   */
  given('[case3] set fails when key not in manifest (negative)', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set --key UNKNOWN_KEY without --env (key not in manifest)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'UNKNOWN_KEY',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'unknown-key-value\n',
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions key not found in manifest', () => {
        const output = result.stdout + result.stderr;
        expect(output.toLowerCase()).toMatch(/not found|not in manifest|unknown/);
      });

      then('error tells user to specify --env', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('--env');
      });
    });

    when('[t1] set --key UNKNOWN_KEY with explicit --env test (works)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'UNKNOWN_KEY',
            '--env',
            'test',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'unknown-key-with-env-value\n',
        }),
      );

      then('exits with status 0 (explicit --env works)', () => {
        expect(result.status).toEqual(0);
      });

      then('key is set for specified env', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.env).toEqual('test');
        expect(parsed.slug).toContain('.test.');
        expect(parsed.slug).toContain('UNKNOWN_KEY');
      });
    });
  });

  /**
   * [uc4] explicit --env overrides inferred env
   *
   * .ref = spec.key-set-behavior.md usecase.5
   *        "explicit --env always works and overrides inference"
   */
  given('[case4] explicit --env overrides inferred env', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set key with explicit --env different from inferred', () => {
      // SHARED_API_KEY is in env.all, but we set with --env test
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'SHARED_API_KEY',
            '--env',
            'test',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'shared-api-key-for-test\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('env is test (explicit overrides inferred all)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.env).toEqual('test');
        expect(parsed.slug).toContain('.test.');
      });
    });
  });
});
