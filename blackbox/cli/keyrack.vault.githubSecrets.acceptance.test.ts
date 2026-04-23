import { chmodSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = acceptance tests for github.secrets vault
 * .why = verify stdout produced when setting/getting/deleting github secrets
 *
 * uses mock gh cli for portable tests without real github credentials
 */

// path to mock gh cli
const MOCK_GH_CLI_DIR = resolve(__dirname, '../.test/assets/mock-gh-cli');

// path to rhachet binary
const RHACHET_BIN = resolve(__dirname, '../../bin/run');

// path to pty helper
const PTY_WITH_ANSWERS = resolve(__dirname, '../.test/assets/pty-with-answers.js');

/**
 * .what = env vars with mock gh cli on PATH
 * .why = acceptance tests must be fully portable without real GitHub credentials
 */
const envWithMockGh = (home: string) => ({
  HOME: home,
  PATH: `${MOCK_GH_CLI_DIR}:${process.env.PATH}`,
});

/**
 * .what = strip ansi codes and pty noise from output
 * .why = snapshots should be readable without escape sequences
 */
const cleanPtyOutput = (str: string): string => {
  const stripped = str
    .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '') // ANSI escape sequences
    .replace(/\x1B\]/g, '') // OSC sequences
    .replace(/\r/g, '') // carriage returns from PTY
    .replace(/·/g, '') // middle dots from PTY
    .replace(/\s+$/gm, '') // trim end-of-line whitespace
    .replace(/\/tmp\/rhachet-test-\d+-[a-z0-9]+/g, '/tmp/rhachet-test-XXXXX') // sanitize temp paths
    .replace(/node:events:[\s\S]*?Node\.js v[\d.]+/g, ''); // strip EPIPE stack trace noise from PTY

  // trim PTY echo noise before tree header
  const treeStart = stripped.indexOf('\u{1F510}');
  return stripped
    .slice(treeStart >= 0 ? treeStart : 0)
    .trim();
};

describe('keyrack.vault.githubSecrets', () => {
  // ensure mock gh executable is chmod +x (git may not preserve permissions)
  beforeAll(() => chmodSync(`${MOCK_GH_CLI_DIR}/gh`, 0o755));

  /**
   * [uc1] set key with PERMANENT_VIA_REPLICA via github.secrets vault
   */
  given('[case1] set key with PERMANENT_VIA_REPLICA', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-vault-github-secrets' });

      // keyrack init (creates encrypted manifest + ssh key discovery)
      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      return r;
    });

    const envMockGh = () => envWithMockGh(repo.path);

    when('[t0] keyrack set --key --vault github.secrets --mech PERMANENT_VIA_REPLICA via pty', () => {
      const result = useBeforeAll(async () => {
        // invoke via pseudo-TTY helper so process.stdin.isTTY is true in the child
        // answers: secret value
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key NEW_SECRET --env test --vault github.secrets --mech PERMANENT_VIA_REPLICA`,
            'secret', // prompt pattern to watch for
            'my-secret-value-123', // answer
          ],
          {
            encoding: 'utf-8',
            cwd: repo.path,
            env: { ...process.env, ...envMockGh() },
            timeout: 60000,
          },
        );
        return r;
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout matches snapshot', () => {
        const cleaned = cleanPtyOutput(result.stdout);
        expect(cleaned).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc2] get failfast for write-only vault (shows remote status)
   */
  given('[case2] get key from write-only github.secrets vault', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-vault-github-secrets' });

      // keyrack init
      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      return r;
    });

    const envMockGh = () => envWithMockGh(repo.path);

    when('[t0] keyrack get --key for github.secrets key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.GITHUB_SECRET_KEY'],
          cwd: repo.path,
          env: envMockGh(),
        }),
      );

      then('exits with non-zero status (write-only vault)', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stdout shows remote status', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc3] del key from github.secrets vault
   */
  given('[case3] del key from github.secrets vault', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-vault-github-secrets' });

      // keyrack init
      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      return r;
    });

    const envMockGh = () => envWithMockGh(repo.path);

    when('[t0] keyrack del --key for github.secrets key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'del', '--key', 'testorg.test.GITHUB_SECRET_KEY'],
          cwd: repo.path,
          env: envMockGh(),
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc4] missing package.json repository field error
   */
  given('[case4] missing package.json repository field', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-vault-github-secrets' });

      // keyrack init
      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      // remove repository field from package.json
      const pkgPath = `${r.path}/package.json`;
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      delete pkg.repository;
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

      return r;
    });

    const envMockGh = () => envWithMockGh(repo.path);

    when('[t0] keyrack set --vault github.secrets without repository field via pty', () => {
      const result = useBeforeAll(async () => {
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key NEW_SECRET --env test --vault github.secrets --mech PERMANENT_VIA_REPLICA`,
            'secret',
            'my-secret-value',
          ],
          {
            encoding: 'utf-8',
            cwd: repo.path,
            env: { ...process.env, ...envMockGh() },
            timeout: 60000,
          },
        );
        return r;
      });

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('output shows repository field required error', () => {
        // error may appear in stdout or stderr depending on how it's reported
        const output = `${result.stdout}\n${result.stderr}`;
        const cleaned = cleanPtyOutput(output);
        // assert on error content, not full snapshot (stdin echo varies by PTY env)
        expect(cleaned).toContain('ConstraintError');
        expect(cleaned).toContain('package.json.repository required');
        expect(cleaned).toContain('github.secrets vault');
      });
    });
  });

  /**
   * [uc5] set key with EPHEMERAL_VIA_GITHUB_APP via github.secrets vault
   * .why = verify guided setup flow works for github.secrets with ephemeral mech
   */
  given('[case5] set key with EPHEMERAL_VIA_GITHUB_APP', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-vault-github-secrets' });

      // keyrack init (creates encrypted manifest + ssh key discovery)
      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      return r;
    });

    const envMockGh = () => envWithMockGh(repo.path);

    when('[t0] keyrack set --key --vault github.secrets --mech EPHEMERAL_VIA_GITHUB_APP via pty', () => {
      const result = useBeforeAll(async () => {
        // invoke via pseudo-TTY helper so process.stdin.isTTY is true in the child
        // answers: org choice (1=testorg), app choice (1=my-test-app), pem path
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key GITHUB_APP_SECRET --env test --vault github.secrets --mech EPHEMERAL_VIA_GITHUB_APP`,
            'choice|.pem',
            '1', '1', './mock-app.pem',
          ],
          {
            encoding: 'utf-8',
            cwd: repo.path,
            env: { ...process.env, ...envMockGh() },
            timeout: 60000,
          },
        );
        return r;
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout matches snapshot', () => {
        const cleaned = cleanPtyOutput(result.stdout);
        expect(cleaned).toMatchSnapshot();
      });
    });
  });
});
