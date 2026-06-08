import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = acceptance test for keyrack owner isolation fix
 * .why = verify set --owner X → source --owner X --key Y round-trip works
 *
 * [fix] fix-keyrack-sudo-source:
 * - set stores key in owner-specific daemon via context.owner
 * - source retrieves from owner-specific daemon via input.owner
 * - without fix: source returns empty because it looks in default daemon
 */

// path to rhachet binary
const RHACHET_BIN = join(__dirname, '../../bin/run');

// path to pty helper
const PTY_WITH_ANSWERS = join(__dirname, '../.test/assets/pty-with-answers.js');

describe('keyrack.osDaemon.ownerIsolation', () => {
  /**
   * [uc1] set with --owner → source with --owner --key
   *
   * journey:
   * 1. keyrack set --owner admin --env sudo --vault os.daemon --key TEST_KEY
   * 2. keyrack source --owner admin --env sudo --key TEST_KEY
   * 3. verify: export TEST_KEY="secret-value"
   */
  given('[case1] set then source with same owner', () => {
    const testOwner = `test-owner-${process.pid}`;
    const testKeyName = 'JOURNEY_TEST_KEY';
    const testSecret = 'journey-test-secret-value';

    // cleanup daemon for this owner before and after
    beforeAll(() => killKeyrackDaemonForTests({ owner: testOwner }));
    afterAll(() => killKeyrackDaemonForTests({ owner: testOwner }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      // keyrack init for default (creates encrypted manifest + ssh key discovery)
      spawnSync(RHACHET_BIN, ['keyrack', 'init'], {
        cwd: r.path,
        env: { ...process.env, HOME: r.path },
        stdio: 'pipe',
      });

      // keyrack init for test owner (creates owner-specific host manifest)
      spawnSync(RHACHET_BIN, ['keyrack', 'init', '--owner', testOwner], {
        cwd: r.path,
        env: { ...process.env, HOME: r.path },
        stdio: 'pipe',
      });

      return r;
    });

    when('[t0] set with --owner via os.daemon vault', () => {
      const setResult = useBeforeAll(async () => {
        // use PTY helper to feed secret to the prompt
        const cmd = `"${RHACHET_BIN}" keyrack set --owner "${testOwner}" --env sudo --vault os.daemon --key "${testKeyName}"`;
        const result = spawnSync(
          'node',
          [PTY_WITH_ANSWERS, cmd, 'enter secret', testSecret],
          {
            cwd: repo.path,
            encoding: 'utf8',
            env: { ...process.env, HOME: repo.path },
          },
        );

        return {
          status: result.status,
          stdout: result.stdout,
          stderr: result.stderr,
        };
      });

      then('set exits with code 0', () => {
        expect(setResult.status).toEqual(0);
      });

      then('set output confirms storage', () => {
        // should mention the vault and key
        expect(setResult.stdout).toContain('os.daemon');
      });
    });

    when('[t1] source with same --owner and --key', () => {
      const sourceResult = useBeforeAll(async () => {
        const result = spawnSync(
          RHACHET_BIN,
          [
            'keyrack',
            'source',
            '--owner',
            testOwner,
            '--env',
            'sudo',
            '--key',
            testKeyName,
          ],
          {
            cwd: repo.path,
            encoding: 'utf8',
            env: { ...process.env, HOME: repo.path },
          },
        );

        return {
          status: result.status,
          stdout: result.stdout,
          stderr: result.stderr,
        };
      });

      then('source exits with code 0', () => {
        expect(sourceResult.status).toEqual(0);
      });

      then('source emits export statement with correct secret', () => {
        // should contain: export JOURNEY_TEST_KEY="journey-test-secret-value"
        expect(sourceResult.stdout).toContain(`export ${testKeyName}=`);
        expect(sourceResult.stdout).toContain(testSecret);
      });
    });

    when('[t2] source with different --owner', () => {
      const sourceResult = useBeforeAll(async () => {
        const result = spawnSync(
          RHACHET_BIN,
          [
            'keyrack',
            'source',
            '--owner',
            'different-owner',
            '--env',
            'sudo',
            '--key',
            testKeyName,
          ],
          {
            cwd: repo.path,
            encoding: 'utf8',
            env: { ...process.env, HOME: repo.path },
          },
        );

        return {
          status: result.status,
          stdout: result.stdout,
          stderr: result.stderr,
        };
      });

      then('source exits with non-zero (key absent)', () => {
        // key should NOT be found in different owner's daemon
        expect(sourceResult.status).not.toEqual(0);
      });

      then('output indicates key absent', () => {
        // uses formatKeyrackGetOneOutput which shows proper status
        expect(sourceResult.stderr).toContain('absent');
      });
    });
  });

  /**
   * [uc2] fail-fast: source --env sudo without --key
   *
   * journey:
   * 1. keyrack source --owner admin --env sudo (no --key)
   * 2. verify: ConstraintError with hint
   */
  given('[case2] source --env sudo without --key fails fast', () => {
    const repo = useBeforeAll(async () => {
      return genTestTempRepo({ fixture: 'with-keyrack-manifest' });
    });

    when('[t0] source called with --env sudo but no --key', () => {
      const result = useBeforeAll(async () => {
        const spawnResult = spawnSync(
          RHACHET_BIN,
          ['keyrack', 'source', '--owner', 'admin', '--env', 'sudo'],
          {
            cwd: repo.path,
            encoding: 'utf8',
            env: { ...process.env, HOME: repo.path },
          },
        );

        return {
          status: spawnResult.status,
          stdout: spawnResult.stdout,
          stderr: spawnResult.stderr,
        };
      });

      then('exits with code 2 (constraint error)', () => {
        expect(result.status).toEqual(2);
      });

      then('error mentions --key requirement', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('sudo credentials require --key');
      });

      then('error provides hint with correct usage', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('rhx keyrack source --env sudo --key');
      });
    });
  });
});
