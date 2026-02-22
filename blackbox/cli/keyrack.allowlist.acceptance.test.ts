import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack allowlist', () => {
  // kill daemon from prior test runs to prevent state leakage
  beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
  /**
   * [uc15] allowlist enforcement
   * keyrack.yml is the allowlist that bounds credential access
   */
  given('[case1] repo with allowlist (keyrack.yml) that excludes a key configured on host', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-allowlist-test' }),
    );

    when('[t0] get --key ALLOWED_KEY without unlock (in allowlist, on host)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.ALLOWED_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is locked (vault keys require unlock)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });

      then('secret is not exposed', () => {
        expect(result.stdout).not.toContain('allowed-key-value-123');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t0.5] unlock then get --key ALLOWED_KEY (roundtrip)', () => {
      // unlock vault keys into daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.ALLOWED_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted after unlock', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('grant value matches stored value', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('allowed-key-value-123');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t0.6] get --key ALLOWED_KEY (human readable, without unlock)', () => {
      // relock to test human readable locked output
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
          args: ['keyrack', 'get', '--key', 'testorg.test.ALLOWED_KEY'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('output contains locked indicator', () => {
        expect(result.stdout).toContain('locked');
        expect(result.stdout).toContain('ALLOWED_KEY');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] get --key SECRET_KEY (on host but NOT in allowlist)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECRET_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is absent (not granted)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('absent');
      });

      then('message states key not found in repo manifest', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.message).toContain('repo manifest');
      });

      then('keyrack does NOT reveal if key exists on host', () => {
        const parsed = JSON.parse(result.stdout);
        // message should not mention host or vault - only repo manifest
        expect(parsed.message).not.toContain('host');
        expect(parsed.message).not.toContain('vault');
      });

      then('fix suggests keyrack set command', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('keyrack set');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1.1] get --key SECRET_KEY (human readable)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECRET_KEY'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('output contains absent indicator', () => {
        expect(result.stdout).toContain('absent');
        expect(result.stdout).toContain('SECRET_KEY');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] get --key NONEXISTENT_KEY (not in allowlist, not on host)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.NONEXISTENT_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is absent', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('absent');
      });

      then('message is same as key-on-host case (no information leak)', () => {
        const parsed = JSON.parse(result.stdout);
        // message should mention repo manifest, same as t1
        expect(parsed.message).toContain('repo manifest');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t3] get --for repo without unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('ALLOWED_KEY is locked (vault keys require unlock)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toEqual(1);
        expect(parsed[0].status).toEqual('locked');
      });

      then('SECRET_KEY is not exposed even though it is on host', () => {
        const raw = result.stdout;
        expect(raw).not.toContain('SECRET_KEY');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t3.5] unlock then get --for repo', () => {
      // unlock vault keys into daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('only returns ALLOWED_KEY (the one in manifest)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toEqual(1);
        expect(parsed[0].grant?.slug).toEqual('testorg.test.ALLOWED_KEY');
      });

      then('SECRET_KEY is not exposed even though it is on host', () => {
        const parsed = JSON.parse(result.stdout);
        const secretKey = parsed.find(
          (a: { grant?: { slug: string } }) =>
            a.grant?.slug === 'testorg.test.SECRET_KEY',
        );
        expect(secretKey).toBeUndefined();
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc15] envvar passthrough bypasses allowlist
   * env vars are set explicitly by user/ci — passthrough is intentional
   */
  given('[case2] env var exists but key not in allowlist', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-allowlist-test' }),
    );

    when('[t0] get --key SECRET_FROM_ENV with env var set', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECRET_FROM_ENV', '--json'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            SECRET_FROM_ENV: 'secret-env-value-789',
          },
        }),
      );

      then('status is granted (envvar passthrough for ci)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('grant source vault is os.envvar', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.source.vault).toEqual('os.envvar');
      });

      then('grant value matches env var', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('secret-env-value-789');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });
});
