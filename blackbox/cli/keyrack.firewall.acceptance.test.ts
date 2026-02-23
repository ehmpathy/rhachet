import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack firewall', () => {
  // kill daemon from prior test runs to prevent state leakage
  beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

  /**
   * [uc6] firewall behavior
   * ghp_* and AKIA* tokens should be blocked by replica mechanism
   */
  given('[case1] repo with firewall test (ghp_* and AKIA* tokens)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-firewall-test' }),
    );

    // unlock vault keys into daemon so firewall can validate them
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--env', 'test'],
        cwd: repo.path,
        env: { HOME: repo.path },
      }),
    );

    when('[t0] get --key SAFE_API_KEY (valid api key)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SAFE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value is passed through', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('sk-safe-api-key-abc123');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t0.1] get --key SAFE_API_KEY (human readable)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SAFE_API_KEY'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('output contains granted indicator', () => {
        expect(result.stdout).toContain('granted');
        expect(result.stdout).toContain('SAFE_API_KEY');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] get --key GHP_TOKEN (github classic pat)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.GHP_TOKEN', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is blocked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('blocked');
      });

      then('reasons mention github classic pat', () => {
        const parsed = JSON.parse(result.stdout);
        const allReasons = parsed.reasons.join(' ').toLowerCase();
        expect(allReasons).toContain('github');
        expect(allReasons).toContain('ghp_');
      });

      then('ghp_ token value is NOT exposed', () => {
        const parsed = JSON.parse(result.stdout);
        expect(JSON.stringify(parsed)).not.toContain(
          'ghp_abcdefghijklmnopqrstuvwxyz1234567890',
        );
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1.1] get --key GHP_TOKEN (human readable)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.GHP_TOKEN'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('output contains blocked indicator', () => {
        expect(result.stdout).toContain('blocked');
        expect(result.stdout).toContain('GHP_TOKEN');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] get --key AKIA_TOKEN (aws long-lived access key)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.AKIA_TOKEN', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is blocked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('blocked');
      });

      then('reasons mention aws access key', () => {
        const parsed = JSON.parse(result.stdout);
        const allReasons = parsed.reasons.join(' ').toLowerCase();
        expect(allReasons).toContain('aws');
        expect(allReasons).toContain('akia');
      });

      then('AKIA token value is NOT exposed', () => {
        const parsed = JSON.parse(result.stdout);
        expect(JSON.stringify(parsed)).not.toContain('AKIAIOSFODNN7EXAMPLE');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t3] get --for repo', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('returns all 3 attempts', () => {
        const parsed = JSON.parse(result.stdout);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toEqual(3);
      });

      then('SAFE_API_KEY is granted', () => {
        const parsed = JSON.parse(result.stdout);
        const safeKey = parsed.find(
          (a: { status: string; grant?: { slug: string } }) =>
            a.grant?.slug === 'testorg.test.SAFE_API_KEY',
        );
        expect(safeKey).toBeDefined();
        expect(safeKey.status).toEqual('granted');
      });

      then('GHP_TOKEN is blocked', () => {
        const parsed = JSON.parse(result.stdout);
        const ghpToken = parsed.find(
          (a: { status: string; slug: string }) =>
            a.slug === 'testorg.test.GHP_TOKEN',
        );
        expect(ghpToken).toBeDefined();
        expect(ghpToken.status).toEqual('blocked');
      });

      then('AKIA_TOKEN is blocked', () => {
        const parsed = JSON.parse(result.stdout);
        const akiaToken = parsed.find(
          (a: { status: string; slug: string }) =>
            a.slug === 'testorg.test.AKIA_TOKEN',
        );
        expect(akiaToken).toBeDefined();
        expect(akiaToken.status).toEqual('blocked');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc6.5] --allow-dangerous bypass
   * ghp_* tokens should be granted when --allow-dangerous is used
   */
  given('[case2] --allow-dangerous bypasses firewall', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-firewall-test' }),
    );

    // unlock vault keys into daemon so firewall can validate them
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--env', 'test'],
        cwd: repo.path,
        env: { HOME: repo.path },
      }),
    );

    when('[t0] get --key GHP_TOKEN --allow-dangerous (json)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'testorg.test.GHP_TOKEN',
            '--allow-dangerous',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted (bypass)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value is returned for ghp_* token', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toContain('ghp_');
      });
    });

    when('[t1] get --key AKIA_TOKEN --allow-dangerous (json)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'testorg.test.AKIA_TOKEN',
            '--allow-dangerous',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted (bypass)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value is returned for AKIA* token', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toContain('AKIA');
      });
    });

    when('[t2] get --for repo --allow-dangerous', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--for',
            'repo',
            '--env',
            'test',
            '--allow-dangerous',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('all 3 keys are granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.every((a: { status: string }) => a.status === 'granted')).toBe(true);
      });
    });
  });

  /**
   * [uc6] firewall via os.envvar
   * ghp_* in env var should also be blocked
   */
  given('[case3] env var contains ghp_* token', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-allowlist-test' }),
    );

    when('[t0] get --key ALLOWED_KEY with ghp_* env var', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.ALLOWED_KEY', '--json'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            // env var takes precedence over vault, and should be blocked
            ALLOWED_KEY: 'ghp_abcdefghijklmnopqrstuvwxyz1234567890',
          },
          logOnError: false,
        }),
      );

      then('status is blocked (firewall catches ghp_* in env)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('blocked');
      });

      then('reasons mention ghp_* pattern', () => {
        const parsed = JSON.parse(result.stdout);
        const allReasons = parsed.reasons.join(' ').toLowerCase();
        expect(allReasons).toContain('ghp_');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] get --key ALLOWED_KEY --allow-dangerous with ghp_* env var', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'testorg.test.ALLOWED_KEY',
            '--allow-dangerous',
            '--json',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            ALLOWED_KEY: 'ghp_abcdefghijklmnopqrstuvwxyz1234567890',
          },
        }),
      );

      then('status is granted (bypass envvar firewall)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value is returned for ghp_* token from envvar', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual(
          'ghp_abcdefghijklmnopqrstuvwxyz1234567890',
        );
      });
    });
  });
});
