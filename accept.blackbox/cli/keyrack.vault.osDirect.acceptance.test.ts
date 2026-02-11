import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('keyrack vault os.direct', () => {
  /**
   * [uc1] get --for repo
   * reads keyrack.yml, resolves all keys, mounts grants
   */
  given('[case1] repo with vault os.direct configured', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
    );

    when('[t0] keyrack get --for repo --json', () => {
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

      then('contains granted status for DIRECT_TEST_KEY', () => {
        const parsed = JSON.parse(result.stdout);
        const attempt = parsed.find(
          (a: { grant?: { slug: string } }) =>
            a.grant?.slug === 'testorg.test.DIRECT_TEST_KEY',
        );
        expect(attempt).toBeDefined();
        expect(attempt.status).toEqual('granted');
      });

      then('grant value matches stored value', () => {
        const parsed = JSON.parse(result.stdout);
        const attempt = parsed.find(
          (a: { grant?: { slug: string } }) =>
            a.grant?.slug === 'testorg.test.DIRECT_TEST_KEY',
        );
        expect(attempt.grant.key.secret).toEqual('direct-test-key-abc123');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] rhx keyrack get --for repo --json (short-circuit)', () => {
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

      then('rhx returns granted status', () => {
        const parsed = JSON.parse(rhxResult.stdout);
        expect(parsed[0].status).toEqual('granted');
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

    when('[t0] keyrack get --key DIRECT_TEST_KEY --json', () => {
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

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('grant.slug matches requested key', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.slug).toEqual('testorg.test.DIRECT_TEST_KEY');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] keyrack get --key DIRECT_TEST_KEY (human readable)', () => {
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

      then('output contains granted indicator', () => {
        expect(result.stdout).toContain('granted');
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

      then('output contains configured keys header', () => {
        expect(result.stdout).toContain('keys configured');
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
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('returns found host config', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed[0].slug).toEqual('testorg.test.DIRECT_TEST_KEY');
        expect(parsed[0].mech).toEqual('REPLICA');
        expect(parsed[0].vault).toEqual('os.direct');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });
});
