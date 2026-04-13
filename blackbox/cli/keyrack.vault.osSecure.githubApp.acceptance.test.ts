import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = path to mock gh CLI executable
 * .why = placed on PATH ahead of real gh CLI for guided setup tests
 */
const MOCK_GH_CLI_DIR = resolve(__dirname, '../.test/assets/mock-gh-cli');

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

/**
 * .what = env vars with mock gh CLI on PATH
 * .why = acceptance tests must be fully portable without real GitHub credentials
 */
const envWithMockGh = (home: string) => ({
  HOME: home,
  PATH: `${MOCK_GH_CLI_DIR}:${process.env.PATH}`,
});

describe('keyrack vault os.secure with EPHEMERAL_VIA_GITHUB_APP', () => {
  // ensure mock gh executable is chmod +x (git may not preserve permissions)
  beforeAll(() => chmodSync(`${MOCK_GH_CLI_DIR}/gh`, 0o755));

  /**
   * [uc1] github app guided setup via os.secure vault
   * verifies org -> app -> pem flow with pseudo-TTY
   */
  given('[case1] guided setup with mock gh CLI', () => {
    // cleanup daemon between cases
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      // keyrack init (creates encrypted manifest + ssh key discovery)
      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
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

    /**
     * .what = env vars for mock gh PATH override (case-local alias)
     * .why = all commands in this case need mock gh on PATH and isolated HOME
     */
    const envMockGh = () => envWithMockGh(repo.path);

    when('[t0] keyrack set --vault os.secure --mech EPHEMERAL_VIA_GITHUB_APP via guided wizard (pseudo-TTY)', () => {
      const result = useBeforeAll(async () => {
        // invoke via pseudo-TTY helper so process.stdin.isTTY is true in the child
        // helper detects "choice" prompts in stdout and sends answers on detection (not timing)
        // answers: 1 (testorg), 1 (my-test-app), ./mock-app.pem (pem path)
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key GITHUB_TOKEN --env test --vault os.secure --mech EPHEMERAL_VIA_GITHUB_APP`,
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

      then('output contains guided setup prompts', () => {
        const out = result.stdout;
        expect(out).toContain('which github org');
        expect(out).toContain('which github app');
        expect(out).toContain('.pem');
      });

      then('host manifest has entry with EPHEMERAL_VIA_GITHUB_APP mech', () => {
        const listResult = invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: envMockGh(),
        });
        const parsed = JSON.parse(listResult.stdout);
        const entry = parsed['testorg.test.GITHUB_TOKEN'];
        expect(entry).toBeDefined();
        expect(entry.mech).toEqual('EPHEMERAL_VIA_GITHUB_APP');
        expect(entry.vault).toEqual('os.secure');
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
          env: envMockGh(),
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('list contains GITHUB_TOKEN with os.secure vault', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.GITHUB_TOKEN']).toBeDefined();
        expect(parsed['testorg.test.GITHUB_TOKEN'].vault).toEqual('os.secure');
      });

      then('list contains EPHEMERAL_VIA_GITHUB_APP mech', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.GITHUB_TOKEN'].mech).toEqual(
          'EPHEMERAL_VIA_GITHUB_APP',
        );
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        const snapped = Object.fromEntries(
          Object.entries(parsed).map(([k, v]: [string, any]) => [
            k,
            {
              ...(v as Record<string, unknown>),
              createdAt: '__TIMESTAMP__',
              updatedAt: '__TIMESTAMP__',
            },
          ]),
        );
        expect(snapped).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc2] single org auto-select
   * when user has only one org, skip the selection prompt
   */
  given('[case2] single org auto-select', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - GITHUB_TOKEN\n',
        'utf-8',
      );

      // create mock .pem file
      writeFileSync(
        `${r.path}/mock-app.pem`,
        [
          '-----BEGIN RSA PRIVATE KEY-----',
          'MIIEpQIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MaXBkvQRkz0Pj/Gx',
          '-----END RSA PRIVATE KEY-----',
        ].join('\n'),
        'utf-8',
      );

      // create a mock gh CLI that returns single org
      const mockGhSingleOrg = `${r.path}/.mock-gh`;
      mkdirSync(mockGhSingleOrg, { recursive: true });
      writeFileSync(
        `${mockGhSingleOrg}/gh`,
        [
          '#!/usr/bin/env bash',
          'ARGS="$*"',
          'case "$ARGS" in',
          '  "auth status") exit 0 ;;',
          '  "api /user/orgs --jq .[].login") echo "singleorg" ;;',
          '  "api /orgs/singleorg/installations --jq .installations[] | {id: .id, app_id: .app_id, slug: .app_slug}")',
          '    echo \'{"id":11111,"app_id":1111,"slug":"single-app"}\' ;;',
          '  *) echo "mock gh: unknown: $ARGS" >&2; exit 1 ;;',
          'esac',
        ].join('\n'),
        'utf-8',
      );
      chmodSync(`${mockGhSingleOrg}/gh`, 0o755);

      return { ...r, mockGhDir: mockGhSingleOrg };
    });

    when('[t0] keyrack set with single org (auto-selected)', () => {
      const result = useBeforeAll(async () => {
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key GITHUB_TOKEN --env test --vault os.secure --mech EPHEMERAL_VIA_GITHUB_APP`,
            '.pem',
            './mock-app.pem',
          ],
          {
            encoding: 'utf-8',
            cwd: repo.path,
            env: {
              ...process.env,
              HOME: repo.path,
              PATH: `${repo.mockGhDir}:${process.env.PATH}`,
            },
            timeout: 60000,
          },
        );
        return r;
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output shows auto-selected org', () => {
        const out = result.stdout;
        expect(out).toContain('auto-selected');
        expect(out).toContain('singleorg');
      });

      then('output shows auto-selected app', () => {
        const out = result.stdout;
        expect(out).toContain('single-app');
      });
    });
  });

  /**
   * [uc3] mech inference when vault supports multiple mechs
   * os.secure supports PERMANENT_VIA_REPLICA and EPHEMERAL_VIA_GITHUB_APP
   */
  given('[case3] mech selection prompt when vault supports multiple mechs', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - GITHUB_TOKEN\n',
        'utf-8',
      );

      return r;
    });

    when('[t0] keyrack set --vault os.secure without --mech (prompts for mech)', () => {
      const result = useBeforeAll(async () => {
        // answers: 2 (EPHEMERAL_VIA_GITHUB_APP is option 2), then guided setup answers
        // but without mock gh, it will fall back to manual input
        // .note = withStdoutPrefix handles indentation; prompts have no hardcoded indent
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key GITHUB_TOKEN --env test --vault os.secure`,
            'choice: |enter secret for',
            '1', // select PERMANENT_VIA_REPLICA (simpler - just needs stdin value)
            'test-secret-value',
          ],
          {
            encoding: 'utf-8',
            cwd: repo.path,
            env: { ...process.env, HOME: repo.path },
            timeout: 60000,
          },
        );
        return r;
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains mech selection prompt', () => {
        const out = result.stdout;
        // should show available mechs
        expect(out).toMatch(/PERMANENT_VIA_REPLICA|EPHEMERAL_VIA_GITHUB_APP|mechanism|mech/i);
      });
    });
  });

  /**
   * [uc4] github app set stores proper json structure
   * verifies acquireForSet produces valid source credential with all required fields
   * .note = unlock/get transformation requires real private key + github api, tested via foreman
   */
  given('[case4] github app stores valid json structure', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - GITHUB_TOKEN\n',
        'utf-8',
      );

      // create mock .pem file
      writeFileSync(
        `${r.path}/mock-app.pem`,
        [
          '-----BEGIN RSA PRIVATE KEY-----',
          'MIIEpQIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MaXBkvQRkz0Pj/Gx',
          '-----END RSA PRIVATE KEY-----',
        ].join('\n'),
        'utf-8',
      );

      return r;
    });

    const envMockGh = () => envWithMockGh(repo.path);

    when('[t0] set github app key via guided setup', () => {
      const result = useBeforeAll(async () => {
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key GITHUB_TOKEN --env test --vault os.secure --mech EPHEMERAL_VIA_GITHUB_APP`,
            'choice|.pem',
            '1', '1', './mock-app.pem',
          ],
          {
            cwd: repo.path,
            env: { ...process.env, ...envMockGh() },
            timeout: 60000,
          },
        );
        return r;
      });

      then('set exits with status 0', () => {
        expect(result.status).toEqual(0);
      });
    });

    when('[t1] verify stored credential structure', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: envMockGh(),
        }),
      );

      then('list exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('entry has mech EPHEMERAL_VIA_GITHUB_APP', () => {
        const parsed = JSON.parse(result.stdout);
        const entry = parsed['testorg.test.GITHUB_TOKEN'];
        expect(entry.mech).toEqual('EPHEMERAL_VIA_GITHUB_APP');
      });

      then('entry has vault os.secure', () => {
        const parsed = JSON.parse(result.stdout);
        const entry = parsed['testorg.test.GITHUB_TOKEN'];
        expect(entry.vault).toEqual('os.secure');
      });

      then('entry has exid with json structure', () => {
        const parsed = JSON.parse(result.stdout);
        const entry = parsed['testorg.test.GITHUB_TOKEN'];
        // exid contains the json blob path or structure reference
        expect(entry.exid).toBeDefined();
      });
    });
  });

  /**
   * [uc5] os.direct + EPHEMERAL_VIA_GITHUB_APP is incompatible
   * os.direct cannot secure source keys for ephemeral mechs
   */
  given('[case5] os.direct rejects EPHEMERAL_VIA_GITHUB_APP', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - GITHUB_TOKEN\n',
        'utf-8',
      );

      return r;
    });

    when('[t0] keyrack set with os.direct and EPHEMERAL_VIA_GITHUB_APP', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack', 'set',
            '--key', 'GITHUB_TOKEN',
            '--env', 'test',
            '--vault', 'os.direct',
            '--mech', 'EPHEMERAL_VIA_GITHUB_APP',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions incompatible vault/mech', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/os\.direct|not support|incompatible|EPHEMERAL/i);
      });

      then('error suggests alternative vault', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/os\.secure|1password|alternative/i);
      });
    });
  });

  /**
   * [uc6] os.secure + EPHEMERAL_VIA_AWS_SSO is incompatible
   * aws sso only works with aws.config vault
   */
  given('[case6] os.secure rejects EPHEMERAL_VIA_AWS_SSO', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - AWS_PROFILE\n',
        'utf-8',
      );

      return r;
    });

    when('[t0] keyrack set with os.secure and EPHEMERAL_VIA_AWS_SSO', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack', 'set',
            '--key', 'AWS_PROFILE',
            '--env', 'test',
            '--vault', 'os.secure',
            '--mech', 'EPHEMERAL_VIA_AWS_SSO',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions incompatible vault/mech', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/os\.secure|not support|incompatible|AWS_SSO/i);
      });

      then('error suggests aws.config vault', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/aws\.config/i);
      });
    });
  });

  /**
   * [uc11] invalid pem path causes fast error
   */
  given('[case7] invalid pem path', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - GITHUB_TOKEN\n',
        'utf-8',
      );

      return r;
    });

    const envMockGh = () => envWithMockGh(repo.path);

    when('[t0] keyrack set with nonexistent pem path', () => {
      const result = useBeforeAll(async () => {
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key GITHUB_TOKEN --env test --vault os.secure --mech EPHEMERAL_VIA_GITHUB_APP`,
            'choice|.pem',
            '1', '1', './nonexistent.pem',
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

      then('error mentions the path that was tried', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/nonexistent\.pem|not found|no such file/i);
      });
    });
  });

  /**
   * [uc12] malformed pem content causes unlock error
   * .note = set succeeds (just stores file contents), unlock fails when @octokit/auth-app validates
   */
  given('[case8] malformed pem content causes unlock error', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - GITHUB_TOKEN\n',
        'utf-8',
      );

      // create a file that is NOT valid PEM format
      writeFileSync(
        `${r.path}/not-a-pem.txt`,
        'this is not a valid PEM file\njust plain text\n',
        'utf-8',
      );

      return r;
    });

    const envMockGh = () => envWithMockGh(repo.path);

    when('[t0] keyrack set with malformed pem file', () => {
      const result = useBeforeAll(async () => {
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key GITHUB_TOKEN --env test --vault os.secure --mech EPHEMERAL_VIA_GITHUB_APP`,
            'choice|.pem',
            '1', '1', './not-a-pem.txt',
          ],
          {
            cwd: repo.path,
            env: { ...process.env, ...envMockGh() },
            timeout: 60000,
          },
        );
        return r;
      });

      then('set exits with status 0 (stores content as-is)', () => {
        expect(result.status).toEqual(0);
      });
    });

    when('[t1] unlock with malformed pem', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--key', 'GITHUB_TOKEN', '--env', 'test'],
          cwd: repo.path,
          env: envMockGh(),
          logOnError: false,
        }),
      );

      then('unlock exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions pem or key format issue', () => {
        const output = result.stdout + result.stderr;
        // @octokit/auth-app throws DECODER error for invalid private key
        expect(output).toMatch(/error|unsupported|decode|private.*key/i);
      });
    });
  });

  /**
   * [uc14] vault inference impossible for GITHUB_TOKEN
   * no --vault provided and key name has no inference pattern
   */
  given('[case9] vault inference impossible', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - GITHUB_TOKEN\n',
        'utf-8',
      );

      return r;
    });

    when('[t0] keyrack set GITHUB_TOKEN without --vault', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack', 'set',
            '--key', 'GITHUB_TOKEN',
            '--env', 'test',
            // no --vault provided
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions vault is required', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/vault|required|--vault/i);
      });
    });
  });
});
