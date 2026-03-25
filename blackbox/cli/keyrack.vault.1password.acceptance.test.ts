import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';
import { isOpCliInstalled } from '@src/domain.operations/keyrack/adapters/vaults/1password/isOpCliInstalled';

describe('keyrack vault 1password', () => {
  // kill daemon from prior test runs to prevent state leakage
  beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

  let opAvailable: boolean;

  beforeAll(async () => {
    opAvailable = await isOpCliInstalled();
    if (!opAvailable) {
      console.log('skipped 1password acceptance tests: op cli not available');
    }
  });

  /**
   * [uc1] set --vault 1password requires valid exid format
   * exid must be op://vault/item/field format
   */
  given('[case1] set validates exid format', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-1password' }),
    );

    when('[t0] set with invalid exid format', () => {
      const result = useBeforeAll(async () => {
        if (!opAvailable) {
          // skip test if op not available
          return { status: 0, stdout: '{}', stderr: '', skipped: true };
        }

        return invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'ONEPASSWORD_TEST_KEY',
            '--env',
            'test',
            '--vault',
            '1password',
            '--exid',
            'invalid-exid-format',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        });
      });

      then('exits with non-zero status', () => {
        if ((result as any).skipped) {
          expect(true).toBe(true);
          return;
        }
        expect(result.status).not.toEqual(0);
      });

      then('error mentions secret reference uri', () => {
        if ((result as any).skipped) {
          expect(true).toBe(true);
          return;
        }
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/secret reference uri|op:\/\//i);
      });
    });

    when('[t1] set with valid exid format (op://vault/item/field)', () => {
      const result = useBeforeAll(async () => {
        if (!opAvailable) {
          // skip test if op not available
          return { status: 0, stdout: '{}', stderr: '', skipped: true };
        }

        return invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'ONEPASSWORD_FORMAT_KEY',
            '--env',
            'test',
            '--vault',
            '1password',
            '--exid',
            'op://test-vault/test-item/credential',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        });
      });

      then('does not fail due to format (may fail due to auth)', () => {
        if ((result as any).skipped) {
          expect(true).toBe(true);
          return;
        }
        // if it fails, it should not be due to format validation
        const output = result.stdout + result.stderr;
        expect(output).not.toMatch(/invalid.*format|must be op:\/\//i);
      });
    });
  });

  /**
   * [uc2] list shows 1password vault entries
   */
  given('[case2] repo with 1password vault configured', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-1password' }),
    );

    when('[t0] keyrack list --json', () => {
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

      then('output is valid json', () => {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      });

      then('json contains ONEPASSWORD_TEST_KEY with 1password vault', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.ONEPASSWORD_TEST_KEY']).toBeDefined();
        expect(parsed['testorg.test.ONEPASSWORD_TEST_KEY'].vault).toEqual('1password');
      });

      then('json contains exid', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.ONEPASSWORD_TEST_KEY'].exid).toEqual(
          'op://test-vault/test-item/credential',
        );
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

    when('[t1] keyrack list (human readable)', () => {
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

      then('output contains ONEPASSWORD_TEST_KEY', () => {
        expect(result.stdout).toContain('ONEPASSWORD_TEST_KEY');
      });

      then('output contains 1password', () => {
        expect(result.stdout).toContain('1password');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc3] get requires unlock for 1password keys
   * 1password keys are not auto-unlocked
   */
  given('[case3] 1password keys require unlock', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-1password' }),
    );

    // cleanup: relock to ensure daemon is empty
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      }),
    );

    when('[t0] get without unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.ONEPASSWORD_TEST_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is locked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });

      then('secret is not exposed', () => {
        // exid (op:// uri) should not appear in locked response
        expect(result.stdout).not.toContain('op://');
        // no grant field with secret
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant).toBeUndefined();
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
  });

  /**
   * [uc4] del removes pointer from keyrack, not 1password item
   * 1password is a refed vault — del only removes the pointer
   */
  given('[case4] del removes pointer only', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-1password' }),
    );

    when('[t0] del removes key from manifest', () => {
      // delete the key
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            'ONEPASSWORD_TEST_KEY',
            '--env',
            'test',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('key no longer appears in list', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.ONEPASSWORD_TEST_KEY']).toBeUndefined();
      });
    });
  });

  /**
   * [uc5] mech is REFERENCE for 1password vault
   * 1password stores a reference (exid), not the secret itself
   */
  given('[case5] 1password uses REFERENCE mech', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-1password' }),
    );

    when('[t0] check mech in list', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('mech is REFERENCE', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.ONEPASSWORD_TEST_KEY'].mech).toEqual('REFERENCE');
      });
    });
  });
});

describe('keyrack vault 1password: op cli not installed', () => {
  /**
   * [uc6] set fails fast when op cli not installed
   * exit code 2 (constraint error) with install instructions
   *
   * .note = this test is conditional — only runs when op cli is NOT installed
   */
  given('[case6] op cli not installed', () => {
    let opInstalled: boolean;

    beforeAll(async () => {
      opInstalled = await isOpCliInstalled();
    });

    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-1password' }),
    );

    when('[t0] set --vault 1password without op cli', () => {
      const result = useBeforeAll(async () => {
        if (opInstalled) {
          // skip test if op is installed
          return { status: 0, stdout: '', stderr: '', skipped: true };
        }

        return invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'ONEPASSWORD_TEST_KEY',
            '--env',
            'test',
            '--vault',
            '1password',
            '--exid',
            'op://test/test/test',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        });
      });

      then('exits with code 2 (constraint error)', () => {
        if ((result as any).skipped) {
          console.log('skipped: op cli is installed');
          expect(true).toBe(true);
          return;
        }
        expect(result.status).toEqual(2);
      });

      then('error mentions op cli not found', () => {
        if ((result as any).skipped) {
          expect(true).toBe(true);
          return;
        }
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/op cli not found|op.*not installed/i);
      });

      then('output includes install instructions', () => {
        if ((result as any).skipped) {
          expect(true).toBe(true);
          return;
        }
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/install|1password/i);
      });
    });
  });
});
