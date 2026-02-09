import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('keyrack firewall', () => {
  /**
   * [uc6] firewall behavior
   * ghp_* and AKIA* tokens should be blocked by replica mechanism
   */
  given('[case1] repo with firewall test (ghp_* and AKIA* tokens)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-firewall-test' }),
    );

    when('[t0] get --key SAFE_API_KEY (valid api key)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'SAFE_API_KEY', '--json'],
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
          args: ['keyrack', 'get', '--key', 'SAFE_API_KEY'],
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
          args: ['keyrack', 'get', '--key', 'GHP_TOKEN', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is blocked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('blocked');
      });

      then('message mentions github classic pat', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.message.toLowerCase()).toContain('github');
        expect(parsed.message).toContain('ghp_');
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
          args: ['keyrack', 'get', '--key', 'GHP_TOKEN'],
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
          args: ['keyrack', 'get', '--key', 'AKIA_TOKEN', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is blocked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('blocked');
      });

      then('message mentions aws access key', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.message.toLowerCase()).toContain('aws');
        expect(parsed.message).toContain('AKIA');
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
          args: ['keyrack', 'get', '--for', 'repo', '--json'],
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
            a.grant?.slug === 'SAFE_API_KEY',
        );
        expect(safeKey).toBeDefined();
        expect(safeKey.status).toEqual('granted');
      });

      then('GHP_TOKEN is blocked', () => {
        const parsed = JSON.parse(result.stdout);
        const ghpToken = parsed.find(
          (a: { status: string; slug: string }) => a.slug === 'GHP_TOKEN',
        );
        expect(ghpToken).toBeDefined();
        expect(ghpToken.status).toEqual('blocked');
      });

      then('AKIA_TOKEN is blocked', () => {
        const parsed = JSON.parse(result.stdout);
        const akiaToken = parsed.find(
          (a: { status: string; slug: string }) => a.slug === 'AKIA_TOKEN',
        );
        expect(akiaToken).toBeDefined();
        expect(akiaToken.status).toEqual('blocked');
      });
    });
  });

  /**
   * [uc6] firewall via os.envvar
   * ghp_* in env var should also be blocked
   */
  given('[case2] env var contains ghp_* token', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-allowlist-test' }),
    );

    when('[t0] get --key ALLOWED_KEY with ghp_* env var', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'ALLOWED_KEY', '--json'],
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

      then('message mentions firewall', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.message.toLowerCase()).toContain('ghp_');
      });
    });
  });
});
