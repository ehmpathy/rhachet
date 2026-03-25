import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack del', () => {
  // kill daemon from prior test runs to prevent state leakage
  beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

  /**
   * [uc1] del accepts full slug as --key
   * full slug should not be double-prefixed
   */
  given('[case1] del with full slug', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
    );

    // set a key first so we can delete it
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'DEL_FULL_SLUG_KEY',
          '--env',
          'test',
          '--vault',
          'os.direct',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'test-secret-value\n',
      }),
    );

    when('[t0] del with full slug (testorg.test.DEL_FULL_SLUG_KEY)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            'testorg.test.DEL_FULL_SLUG_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains correct slug (not double-prefixed)', () => {
        // should show testorg.test.DEL_FULL_SLUG_KEY
        // NOT testorg.all.testorg.test.DEL_FULL_SLUG_KEY
        expect(result.stdout).toContain('testorg.test.DEL_FULL_SLUG_KEY');
        expect(result.stdout).not.toContain('testorg.all.testorg');
        expect(result.stdout).not.toContain('testorg.test.testorg');
      });

      then('key is no longer in list', async () => {
        const listResult = await invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        const parsed = JSON.parse(listResult.stdout);
        expect(parsed['testorg.test.DEL_FULL_SLUG_KEY']).toBeUndefined();
      });
    });
  });

  /**
   * [uc2] del with raw key and --env
   * standard usage: raw key name + explicit env
   */
  given('[case2] del with raw key and --env', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
    );

    // set a key first so we can delete it
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'DEL_RAW_KEY',
          '--env',
          'test',
          '--vault',
          'os.direct',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'test-secret-value\n',
      }),
    );

    when('[t0] del with raw key and --env test', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            'DEL_RAW_KEY',
            '--env',
            'test',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains correct slug', () => {
        expect(result.stdout).toContain('testorg.test.DEL_RAW_KEY');
      });

      then('key is no longer in list', async () => {
        const listResult = await invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        const parsed = JSON.parse(listResult.stdout);
        expect(parsed['testorg.test.DEL_RAW_KEY']).toBeUndefined();
      });
    });
  });

  /**
   * [uc3] del infers env from full slug
   * when full slug provided, --env should be optional
   */
  given('[case3] del infers env from full slug', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
    );

    // set a key first so we can delete it
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'DEL_INFER_KEY',
          '--env',
          'prod',
          '--vault',
          'os.direct',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'test-secret-value\n',
      }),
    );

    when('[t0] del with full slug, no --env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            'testorg.prod.DEL_INFER_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains correct slug with prod env', () => {
        expect(result.stdout).toContain('testorg.prod.DEL_INFER_KEY');
      });

      then('key is no longer in list', async () => {
        const listResult = await invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        const parsed = JSON.parse(listResult.stdout);
        expect(parsed['testorg.prod.DEL_INFER_KEY']).toBeUndefined();
      });
    });
  });

  /**
   * [uc4] del with full slug org mismatch
   * full slug org must match manifest org
   */
  given('[case4] del with full slug org mismatch', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
    );

    when('[t0] del with full slug from different org', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            'wrongorg.test.SOME_KEY',
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
        expect(output).toMatch(/org.*mismatch|does not match/i);
      });
    });
  });

  /**
   * [uc5] del with full slug and mismatched --env
   * if both provided, they must match
   */
  given('[case5] del with full slug and mismatched --env', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
    );

    when('[t0] del with full slug (test env) and --env prod', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            'testorg.test.SOME_KEY',
            '--env',
            'prod',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions env mismatch', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/env.*mismatch|does not match|conflicts/i);
      });
    });
  });
});
