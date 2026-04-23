import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack firewall', () => {
  beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

  given('[case1] keyrack firewall command', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-firewall-test' }),
    );

    when('[t-help] firewall --help', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'firewall', '--help'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits successfully', () => {
        expect(result.status).toEqual(0);
      });

      then('shows usage info', () => {
        expect(result.stdout).toContain('--env');
        expect(result.stdout).toContain('--from');
        expect(result.stdout).toContain('--into');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t0] firewall with safe key (json output)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'firewall',
            '--env',
            'test',
            '--from',
            'json(env://SECRETS_JSON)',
            '--into',
            'json',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            SECRETS_JSON: JSON.stringify({
              SAFE_API_KEY: 'sk-safe-api-key-abc123',
            }),
          },
        }),
      );

      then('exits successfully', () => {
        expect(result.status).toEqual(0);
      });

      then('output is pure JSON (pipeable to jq)', () => {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      });

      then('json output contains granted key', () => {
        const attempts = JSON.parse(result.stdout);
        const safeKey = attempts.find(
          (a: { status: string; grant?: { slug: string } }) =>
            a.grant?.slug === 'testorg.test.SAFE_API_KEY',
        );
        expect(safeKey).toBeDefined();
        expect(safeKey.status).toEqual('granted');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] firewall with blocked key (ghp_*)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'firewall',
            '--env',
            'test',
            '--from',
            'json(env://SECRETS_JSON)',
            '--into',
            'json',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            SECRETS_JSON: JSON.stringify({
              SAFE_API_KEY: 'sk-safe-api-key-abc123',
              GHP_TOKEN: 'ghp_abcdefghijklmnopqrstuvwxyz1234567890',
              AKIA_TOKEN: 'AKIAIOSFODNN7EXAMPLE',
            }),
          },
          logOnError: false,
        }),
      );

      then('exits with code 2 (blocked)', () => {
        expect(result.status).toEqual(2);
      });

      then('output contains blocked indicator', () => {
        expect(result.stdout).toContain('blocked');
      });

      then('json output shows blocked keys', () => {
        const attempts = JSON.parse(result.stdout);
        const ghpBlocked = attempts.find(
          (a: { status: string; slug: string }) =>
            a.slug === 'testorg.test.GHP_TOKEN',
        );
        expect(ghpBlocked).toBeDefined();
        expect(ghpBlocked.status).toEqual('blocked');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] firewall with keys in vault but not provided via env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'firewall',
            '--env',
            'test',
            '--from',
            'json(env://SECRETS_JSON)',
            '--into',
            'json',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            SECRETS_JSON: JSON.stringify({
              SAFE_API_KEY: 'sk-safe-api-key-abc123',
            }),
          },
        }),
      );

      then('exits successfully (locked keys are ok)', () => {
        expect(result.status).toEqual(0);
      });

      then('json output shows locked keys (exist in vault but not provided)', () => {
        const attempts = JSON.parse(result.stdout);
        const lockedKeys = attempts.filter(
          (a: { status: string }) => a.status === 'locked',
        );
        expect(lockedKeys.length).toBeGreaterThan(0);
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t3] firewall with stdin input', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'firewall',
            '--env',
            'test',
            '--from',
            'json(stdin://*)',
            '--into',
            'json',
          ],
          cwd: repo.path,
          stdin: JSON.stringify({
            SAFE_API_KEY: 'sk-safe-api-key-abc123',
          }),
          env: { HOME: repo.path },
        }),
      );

      then('exits successfully', () => {
        expect(result.status).toEqual(0);
      });

      then('processes stdin input', () => {
        const attempts = JSON.parse(result.stdout);
        const safeKey = attempts.find(
          (a: { status: string; grant?: { slug: string } }) =>
            a.grant?.slug === 'testorg.test.SAFE_API_KEY',
        );
        expect(safeKey).toBeDefined();
        expect(safeKey.status).toEqual('granted');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t4] firewall requires --env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'firewall',
            '--from',
            'json(env://SECRETS_JSON)',
            '--into',
            'json',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            SECRETS_JSON: JSON.stringify({}),
          },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions --env required', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/--env.*required|required.*--env/i);
      });

      then('stderr matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t5] firewall requires --from', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'firewall',
            '--env',
            'test',
            '--into',
            'json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions --from required', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/--from.*required|required.*--from/i);
      });

      then('stderr matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t6] firewall requires --into', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'firewall',
            '--env',
            'test',
            '--from',
            'json(env://SECRETS_JSON)',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            SECRETS_JSON: JSON.stringify({}),
          },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions --into required', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/--into.*required|required.*--into/i);
      });

      then('stderr matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t7] firewall with safe key (github.actions output)', () => {
      const githubEnvPath = genTempDir({ slug: 'gh-env-t7' }) + '/github_env';

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'firewall',
            '--env',
            'test',
            '--from',
            'json(env://SECRETS_JSON)',
            '--into',
            'github.actions',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            GITHUB_ENV: githubEnvPath,
            SECRETS_JSON: JSON.stringify({
              SAFE_API_KEY: 'sk-safe-api-key-abc123',
            }),
          },
        }),
      );

      then('exits successfully', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains github actions format', () => {
        expect(result.stdout).toContain('::add-mask::');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t8] firewall with blocked key (github.actions output)', () => {
      const githubEnvPath = genTempDir({ slug: 'gh-env-t8' }) + '/github_env';

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'firewall',
            '--env',
            'test',
            '--from',
            'json(env://SECRETS_JSON)',
            '--into',
            'github.actions',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            GITHUB_ENV: githubEnvPath,
            SECRETS_JSON: JSON.stringify({
              SAFE_API_KEY: 'sk-safe-api-key-abc123',
              GHP_TOKEN: 'ghp_abcdefghijklmnopqrstuvwxyz1234567890',
            }),
          },
          logOnError: false,
        }),
      );

      then('exits with code 2 (blocked)', () => {
        expect(result.status).toEqual(2);
      });

      then('output contains blocked indicator', () => {
        expect(result.stdout).toContain('blocked');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t9] firewall with invalid --into format', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'firewall',
            '--env',
            'test',
            '--from',
            'json(env://SECRETS_JSON)',
            '--into',
            'invalid-format',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            SECRETS_JSON: JSON.stringify({}),
          },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions invalid format', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/invalid|unknown|unsupported/i);
      });

      then('stderr matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t10] firewall with malformed SECRETS_JSON', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'firewall',
            '--env',
            'test',
            '--from',
            'json(env://SECRETS_JSON)',
            '--into',
            'json',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            SECRETS_JSON: 'not-valid-json{{{',
          },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions parse or json error', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/parse|json|invalid/i);
      });

      then('stderr matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t11] firewall with SECRETS_JSON env var not set', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'firewall',
            '--env',
            'test',
            '--from',
            'json(env://SECRETS_JSON)',
            '--into',
            'json',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
          },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions env var not set', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/env.*not.*set|not.*defined|empty/i);
      });

      then('stderr matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t12] firewall github.actions output requires GITHUB_ENV', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'firewall',
            '--env',
            'test',
            '--from',
            'json(env://SECRETS_JSON)',
            '--into',
            'github.actions',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            GITHUB_ENV: undefined, // explicitly unset (CI env leaks otherwise)
            SECRETS_JSON: JSON.stringify({
              SAFE_API_KEY: 'sk-safe-api-key-abc123',
            }),
          },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions GITHUB_ENV', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/GITHUB_ENV/i);
      });

      then('stderr matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t13] firewall with multiline secret value', () => {
      const githubEnvPath = genTempDir({ slug: 'gh-env-t13' }) + '/github_env';
      const multilineSecret =
        '-----BEGIN RSA PRIVATE KEY-----\nMIIE...test...\nline2\n-----END RSA PRIVATE KEY-----';

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'firewall',
            '--env',
            'test',
            '--from',
            'json(env://SECRETS_JSON)',
            '--into',
            'github.actions',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            GITHUB_ENV: githubEnvPath,
            SECRETS_JSON: JSON.stringify({
              SAFE_API_KEY: multilineSecret,
            }),
          },
        }),
      );

      then('exits successfully', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains github actions format', () => {
        expect(result.stdout).toContain('::add-mask::');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
