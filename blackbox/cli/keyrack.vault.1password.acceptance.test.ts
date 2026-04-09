import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';
import { isOpCliInstalled } from '@src/domain.operations/keyrack/adapters/vaults/1password/isOpCliInstalled';

/**
 * .what = path to mock gh CLI executable
 * .why = placed on PATH ahead of real gh CLI for guided setup tests
 */
const MOCK_GH_CLI_DIR = resolve(__dirname, '../.test/assets/mock-gh-cli');

/**
 * .what = path to mock op CLI executable
 * .why = placed on PATH ahead of real op CLI for 1password vault tests
 */
const MOCK_OP_CLI_DIR = resolve(__dirname, '../.test/assets/mock-op-cli');

/**
 * .what = path to the rhachet binary
 * .why = needed for pseudo-TTY invocation via the pty-with-answers wrapper
 */
const RHACHET_BIN = resolve(__dirname, '../../bin/run');

/**
 * .what = path to the PTY answer-feeder helper
 * .why = watches stdout for prompt patterns and sends answers on detection (not timing)
 */
const PTY_WITH_ANSWERS = resolve(__dirname, '../.test/assets/pty-with-answers.js');

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

      then('returns absent status (1password vault not checked)', () => {
        // .note = inferKeyrackKeyStatusWhenNotGranted only checks os.secure and os.direct
        // .note = 1password vault returns 'absent' since we cant check without decrypt
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('absent');
      });

      then('secret is not exposed', () => {
        // exid (op:// uri) should not appear in locked response
        expect(result.stdout).not.toContain('op://');
        // no grant field with secret
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant).toBeUndefined();
      });

      then('fix mentions set', () => {
        // .note = since status is 'absent', fix suggests set (not unlock)
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('set');
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
   * [uc5] mech is PERMANENT_VIA_REFERENCE for 1password vault
   * 1password stores a reference (exid), not the secret itself
   */
  given('[case5] 1password uses PERMANENT_VIA_REFERENCE mech', () => {
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

      then('mech is PERMANENT_VIA_REFERENCE', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.ONEPASSWORD_TEST_KEY'].mech).toEqual(
          'PERMANENT_VIA_REFERENCE',
        );
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

/**
 * .what = tests for EPHEMERAL_VIA_GITHUB_APP mech with 1password vault
 * .why = usecase.2 from blackbox criteria - github app credentials stored in 1password
 *
 * .note = uses mock op CLI and mock gh CLI for portable tests without real credentials
 */
describe('keyrack vault 1password with EPHEMERAL_VIA_GITHUB_APP', () => {
  // ensure mock CLIs are executable (git may not preserve permissions)
  beforeAll(() => {
    chmodSync(`${MOCK_GH_CLI_DIR}/gh`, 0o755);
    chmodSync(`${MOCK_OP_CLI_DIR}/op`, 0o755);
  });

  // kill daemon between tests
  beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

  /**
   * .what = env vars with mock CLIs on PATH
   * .why = acceptance tests must be fully portable without real credentials
   */
  const envWithMocks = (home: string) => ({
    HOME: home,
    PATH: `${MOCK_OP_CLI_DIR}:${MOCK_GH_CLI_DIR}:${process.env.PATH}`,
  });

  /**
   * [uc2] github app set with 1password vault
   * verifies org -> app -> pem -> exid flow with pseudo-TTY
   */
  given('[case1] guided setup with mock gh CLI and mock op CLI', () => {
    // cleanup daemon between cases
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      // keyrack init (creates encrypted manifest + ssh key discovery)
      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path, PATH: `${MOCK_OP_CLI_DIR}:${process.env.PATH}` },
      });

      // write repo manifest so org is known
      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - GITHUB_TOKEN\n',
        'utf-8',
      );

      // create mock .pem file in the repo
      writeFileSync(
        `${r.path}/mock-app.pem`,
        [
          '-----BEGIN RSA PRIVATE KEY-----',
          'MIIEpQIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MaXBkvQRkz0Pj/Gx',
          'KJELGl0FooHx7tXfWnj4TjB1kqR8xBzK3K3L3HqHbCh9XV4nlluTLArdB0JDcrPN',
          'N6VOJB3Bz3B3L3gB7epYcKpf1KJCi2Vl3qT3L3L3L3L3L3L3L3L3L3L3L3L3L3L3',
          'L3L3L3L3L3L3L3L3L3L3L3L3L3L3L3L3L3L3L3L3L3L3L3L3L3L3L3L3L3L3L3L3',
          '-----END RSA PRIVATE KEY-----',
        ].join('\n'),
        'utf-8',
      );

      return r;
    });

    when('[t0] keyrack set --vault 1password --mech EPHEMERAL_VIA_GITHUB_APP via guided wizard (pseudo-TTY)', () => {
      const result = useBeforeAll(async () => {
        // invoke via pseudo-TTY helper so process.stdin.isTTY is true in the child
        // helper detects prompts in stdout and sends answers on detection (not timing)
        // answers: 1 (testorg), 1 (my-test-app), ./mock-app.pem (pem path), op://test-vault/github-app/credential (exid)
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key GITHUB_TOKEN --env test --vault 1password --mech EPHEMERAL_VIA_GITHUB_APP`,
            'choice|.pem|1password',
            '1', '1', './mock-app.pem', 'op://test-vault/github-app/credential',
          ],
          {
            encoding: 'utf-8',
            cwd: repo.path,
            env: { ...process.env, ...envWithMocks(repo.path) },
            timeout: 60000,
          },
        );
        return r;
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains guided setup prompts', () => {
        const out = result.stdout;
        expect(out).toContain('which github org');
        expect(out).toContain('which github app');
        expect(out).toContain('.pem');
      });

      then('output contains 1password exid prompt', () => {
        const out = result.stdout;
        expect(out).toMatch(/1password|op:\/\//i);
      });

      then('host manifest has entry with EPHEMERAL_VIA_GITHUB_APP mech and 1password vault', () => {
        const listResult = invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: envWithMocks(repo.path),
        });
        const parsed = JSON.parse(listResult.stdout);
        const entry = parsed['testorg.test.GITHUB_TOKEN'];
        expect(entry).toBeDefined();
        expect(entry.mech).toEqual('EPHEMERAL_VIA_GITHUB_APP');
        expect(entry.vault).toEqual('1password');
      });

      then('exid is stored as op:// uri', () => {
        const listResult = invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: envWithMocks(repo.path),
        });
        const parsed = JSON.parse(listResult.stdout);
        const entry = parsed['testorg.test.GITHUB_TOKEN'];
        expect(entry.exid).toMatch(/^op:\/\//);
      });

      then('stdout matches snapshot', () => {
        // strip ANSI escape codes and PTY control sequences for stable snapshot
        const stripped = result.stdout
          .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '') // ANSI escape sequences
          .replace(/\x1B\]/g, '') // OSC sequences
          .replace(/\r/g, '') // carriage returns from PTY
          .replace(/·/g, '') // middle dots from PTY
          .replace(/\s+$/gm, ''); // trim end-of-line whitespace
        // trim PTY echo noise before tree header
        const treeStart = stripped.indexOf('\u{1F510}');
        const clean = stripped
          .slice(treeStart >= 0 ? treeStart : 0)
          .trim();
        expect(clean).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list --json after guided set', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: envWithMocks(repo.path),
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('list contains GITHUB_TOKEN with 1password vault', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.GITHUB_TOKEN']).toBeDefined();
        expect(parsed['testorg.test.GITHUB_TOKEN'].vault).toEqual('1password');
      });

      then('list contains EPHEMERAL_VIA_GITHUB_APP mech', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.GITHUB_TOKEN'].mech).toEqual('EPHEMERAL_VIA_GITHUB_APP');
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
});
