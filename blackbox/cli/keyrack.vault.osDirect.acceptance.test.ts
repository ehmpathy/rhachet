import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack vault os.direct', () => {
  // kill daemon from prior test runs to prevent state leakage
  beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
  /**
   * [uc1] get --for repo
   * reads keyrack.yml, resolves all keys, mounts grants
   */
  given('[case1] repo with vault os.direct configured', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
    );

    // relock to clear daemon keys from prior test runs
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      }),
    );

    when('[t0] keyrack get --for repo --json (without unlock)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output is valid json array', () => {
        const parsed = JSON.parse(result.stdout);
        expect(Array.isArray(parsed)).toBe(true);
      });

      then('all keys are locked (vault keys require unlock)', () => {
        const parsed = JSON.parse(result.stdout);
        const locked = parsed.filter(
          (a: { status: string }) => a.status === 'locked',
        );
        expect(locked.length).toBeGreaterThan(0);
      });

      then('secret values are not exposed', () => {
        expect(result.stdout).not.toContain('direct-test-key-abc123');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] rhx keyrack get --for repo --json (without unlock)', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('rhx exits with status 0', () => {
        expect(rhxResult.status).toEqual(0);
      });

      then('rhx returns locked status', () => {
        const parsed = JSON.parse(rhxResult.stdout);
        expect(parsed[0].status).toEqual('locked');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(rhxResult.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc2] get --key $key
   * resolves single key from host manifest
   */
  given('[case2] repo with single key configured', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
    );

    // relock to clear daemon keys from prior test runs
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      }),
    );

    when('[t0] keyrack get --key DIRECT_TEST_KEY --json (without unlock)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.DIRECT_TEST_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output is valid json object', () => {
        const parsed = JSON.parse(result.stdout);
        expect(typeof parsed).toBe('object');
        expect(parsed.status).toBeDefined();
      });

      then('status is locked (vault key requires unlock)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });

      then('fix mentions unlock', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('unlock');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] keyrack get --key DIRECT_TEST_KEY (human readable, without unlock)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.DIRECT_TEST_KEY'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains locked indicator', () => {
        expect(result.stdout).toContain('locked');
        expect(result.stdout).toContain('DIRECT_TEST_KEY');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc4] unlock command (session-based)
   * session-based unlock sends keys to daemon
   */
  given('[case3] repo with vault configured', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
    );

    when('[t0] keyrack unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains unlocked indicator', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/unlock|keys/i);
      });
    });

    when('[t1] get --key DIRECT_TEST_KEY after unlock', () => {
      // unlock first
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      // then get
      const getResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.DIRECT_TEST_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted after unlock', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('grant value matches stored value', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.grant.key.secret).toEqual('direct-test-key-abc123');
      });

      then('grant source vault is os.daemon (via unlock)', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.grant.source.vault).toEqual('os.daemon');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * list command
   */
  given('[case4] keyrack list', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
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

      then('output contains keyrack header', () => {
        expect(result.stdout).toContain('keyrack');
      });

      then('output contains DIRECT_TEST_KEY', () => {
        expect(result.stdout).toContain('DIRECT_TEST_KEY');
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

      then('output is valid json', () => {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      });

      then('json contains DIRECT_TEST_KEY host config', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.DIRECT_TEST_KEY']).toBeDefined();
        expect(parsed['testorg.test.DIRECT_TEST_KEY'].vault).toEqual('os.direct');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        const snapped = Object.fromEntries(
          Object.entries(parsed).map(([k, v]: [string, any]) => [
            k,
            { ...(v as Record<string, unknown>), createdAt: '__TIMESTAMP__', updatedAt: '__TIMESTAMP__' },
          ]),
        );
        expect(snapped).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc9] findsert semantics
   * host found with same attrs returns found
   */
  given('[case5] findsert semantics', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
    );

    when('[t0] set key that already exists with same attrs', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'DIRECT_TEST_KEY',
            '--env',
            'test',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'unused-findsert-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('returns found host config', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('testorg.test.DIRECT_TEST_KEY');
        expect(parsed.mech).toEqual('REPLICA');
        expect(parsed.vault).toEqual('os.direct');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });
});
