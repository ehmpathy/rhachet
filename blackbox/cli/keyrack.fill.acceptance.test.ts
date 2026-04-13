import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

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

describe('keyrack fill cli', () => {
  /**
   * test case: rhx keyrack fill --help
   * verifies help output describes the command correctly
   */
  given('[case1] any repo', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] rhx keyrack fill --help', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill', '--help'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows fill command description', () => {
        expect(result.stdout).toContain('fill');
      });

      then('shows --env option', () => {
        expect(result.stdout).toContain('--env');
      });

      then('shows --owner option', () => {
        expect(result.stdout).toContain('--owner');
      });

      then('shows --prikey option', () => {
        expect(result.stdout).toContain('--prikey');
      });

      then('shows --key option', () => {
        expect(result.stdout).toContain('--key');
      });

      then('shows --refresh option', () => {
        expect(result.stdout).toContain('--refresh');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * test case: error when --env not provided
   * verifies required option validation
   */
  given('[case2] repo with keyrack manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] rhx keyrack fill without --env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('shows error about absent --env', () => {
        // commander shows "required option" errors
        expect(result.stderr.toLowerCase()).toContain('env');
      });
    });
  });

  /**
   * test case: error when no keyrack.yml in repo
   * verifies manifest validation
   */
  given('[case3] repo without keyrack manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] rhx keyrack fill --env test', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('shows error about no keyrack.yml', () => {
        expect(result.stderr.toLowerCase()).toContain('keyrack');
      });
    });
  });

  /**
   * test case: no keys match env
   * verifies graceful behavior when no keys for specified env
   */
  given('[case4] repo with keyrack manifest (test keys only)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] rhx keyrack fill --env prod (no prod keys exist)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill', '--env', 'prod'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0 (empty is not an error)', () => {
        expect(result.status).toEqual(0);
      });

      then('shows no keys found message', () => {
        expect(result.stdout.toLowerCase()).toContain('no keys');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * test case: specific key not found
   * verifies error when --key specifies non-existent key
   */
  given('[case5] repo with keyrack manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] rhx keyrack fill --env test --key NONEXISTENT', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill', '--env', 'test', '--key', 'NONEXISTENT'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('shows error about key not found', () => {
        expect(result.stderr.toLowerCase()).toContain('not found');
      });
    });
  });

  /**
   * test case: fill skips keys satisfied by env=all
   * verifies that when a key is declared in env.test but exists as env=all,
   * fill recognizes the env=all key satisfies the requirement and skips
   */
  given('[case6] repo with env.test key already set as env=all', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-env-all-fallback' }),
    );

    when('[t0] rhx keyrack fill --env test', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows skip message for FILL_TEST_KEY with env=all slug', () => {
        expect(result.stdout).toContain('found vaulted under');
        expect(result.stdout).toContain('testorg.all.FILL_TEST_KEY');
      });

      then('shows skip message for ANOTHER_TEST_KEY with env=all slug', () => {
        expect(result.stdout).toContain('testorg.all.ANOTHER_TEST_KEY');
      });

      then('shows keyrack fill complete message', () => {
        expect(result.stdout).toContain('keyrack fill complete');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * test case: fill prompts for mechanism selection via PTY
   * verifies that fill shows "which mechanism?" prompt when vault supports multiple mechs
   * .note = this is the key acceptance test for the mech inference fix
   */
  given('[case7] fill prompts for mechanism selection (pseudo-TTY)', () => {
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

      // write repo manifest with key in env.test
      const agentDir = `${r.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - API_KEY\n',
        'utf-8',
      );

      return r;
    });

    when('[t0] keyrack fill --env test via pseudo-TTY (prompts for mech)', () => {
      const result = useBeforeAll(async () => {
        // invoke via pseudo-TTY so interactive prompts work
        // prompt pattern: "choice" for mech selection, "enter secret for" for secret input
        // answers: 1 (PERMANENT_VIA_REPLICA), then the secret value
        // .note = withStdoutPrefix handles indentation; prompts have no hardcoded indent
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack fill --env test`,
            'choice: |enter secret for',
            '1', // select PERMANENT_VIA_REPLICA
            'test-fill-secret-value',
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

      then('output contains mechanism selection prompt', () => {
        const out = result.stdout;
        // should show "which mechanism?" and available mechs
        expect(out).toContain('which mechanism');
        expect(out).toMatch(/PERMANENT_VIA_REPLICA|EPHEMERAL_VIA_GITHUB_APP/i);
      });

      then('output shows key was set', () => {
        const out = result.stdout;
        expect(out).toContain('API_KEY');
      });

      then('stdout matches snapshot', () => {
        // strip ANSI escape codes and PTY control sequences for stable snapshot
        const stripped = result.stdout
          .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '') // ANSI escape sequences
          .replace(/\x1B\]/g, '') // OSC sequences
          .replace(/\r/g, '') // carriage returns from PTY
          .replace(/·/g, '') // middle dots from PTY
          .replace(/\s+$/gm, '') // trim end-of-line whitespace
          .replace(/\(pid: \d+\)/g, '(pid: __PID__)'); // redact daemon PID
        // trim PTY echo noise before tree header
        const treeStart = stripped.indexOf('\u{1F510}');
        const clean = stripped
          .slice(treeStart >= 0 ? treeStart : 0)
          .trim();
        expect(clean).toMatchSnapshot();
      });
    });
  });
});
