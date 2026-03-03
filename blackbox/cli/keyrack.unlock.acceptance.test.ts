import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * keyrack unlock acceptance tests
 *
 * proves that keyrack unlock works naturally via identity-based auth:
 * - no source required
 * - no passphrase prompts
 * - works for default owner and custom owner
 * - works with env=all, env=test, env=sudo
 */
describe('keyrack unlock', () => {
  // cleanup daemons from prior test runs
  beforeAll(() => {
    killKeyrackDaemonForTests({ owner: null });
    killKeyrackDaemonForTests({ owner: 'ehmpath' });
  });

  /**
   * [uc1] unlock via rhx works naturally (no source required)
   *
   * the legacy bin/rhx had a bug where it showed "source required" instead
   * of executing the unlock command. this test proves that's fixed.
   */
  given('[case1] repo with os.direct vault keys', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
    );

    when('[t0] rhx keyrack unlock --env test', () => {
      const result = useThen('it completes', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output does NOT show "source required"', () => {
        expect(result.stdout).not.toContain('source required');
        expect(result.stderr).not.toContain('source required');
      });

      then('output shows unlock success', () => {
        expect(result.stdout).toContain('keyrack unlock');
      });
    });

    when('[t1] keyrack get after unlock', () => {
      // unlock first
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useThen('get completes', () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.DIRECT_TEST_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('grant source vault is os.daemon', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.source.vault).toEqual('os.daemon');
      });
    });
  });

  /**
   * [uc2] unlock with --owner works naturally
   *
   * custom owner unlock uses owner-namespaced daemon and vault paths.
   */
  given('[case2] repo with custom owner keyrack', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
    );

    // setup: init custom owner and set a key
    useBeforeAll(async () => {
      // init custom owner manifest
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'ehmpath'],
        cwd: repo.path,
        env: { HOME: repo.path },
      });

      // set key for custom owner with sudo env (enables unlock without repoManifest)
      await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'CUSTOM_OWNER_KEY',
          '--env',
          'sudo',
          '--org',
          '@all',
          '--mech',
          'REPLICA',
          '--vault',
          'os.direct',
          '--owner',
          'ehmpath',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'custom-owner-secret-value\n',
      });

      return { setup: 'complete' };
    });

    when('[t0] rhx keyrack unlock --owner ehmpath --env sudo --key CUSTOM_OWNER_KEY', () => {
      const result = useThen('it completes', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'unlock',
            '--owner',
            'ehmpath',
            '--env',
            'sudo',
            '--key',
            'CUSTOM_OWNER_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output does NOT show "source required"', () => {
        expect(result.stdout).not.toContain('source required');
        expect(result.stderr).not.toContain('source required');
      });

      then('output shows unlock success', () => {
        expect(result.stdout).toContain('keyrack unlock');
      });

      then('output shows the unlocked key', () => {
        expect(result.stdout).toContain('CUSTOM_OWNER_KEY');
      });
    });

    when('[t1] keyrack get --owner ehmpath after unlock', () => {
      // unlock first
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'unlock',
            '--owner',
            'ehmpath',
            '--env',
            'sudo',
            '--key',
            'CUSTOM_OWNER_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useThen('get completes', () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            '@all.sudo.CUSTOM_OWNER_KEY',
            '--owner',
            'ehmpath',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('secret matches configured value', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('custom-owner-secret-value');
      });

      then('grant source vault is os.daemon', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.source.vault).toEqual('os.daemon');
      });
    });
  });

  /**
   * [uc3] unlock with os.secure vault (identity-based)
   *
   * os.secure vault uses age encryption with recipient key.
   * unlock should work naturally via identity discovery.
   */
  given('[case3] repo with os.secure vault', () => {
    // cleanup daemon to ensure fresh state
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    when('[t0] rhx keyrack unlock --env test', () => {
      const result = useThen('it completes', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output does NOT show "source required"', () => {
        expect(result.stdout).not.toContain('source required');
        expect(result.stderr).not.toContain('source required');
      });

      then('output shows unlock success', () => {
        expect(result.stdout).toContain('keyrack unlock');
      });
    });

    when('[t1] keyrack get after unlock', () => {
      // unlock first
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useThen('get completes', () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('secret matches expected value', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('portable-secure-value-xyz789');
      });

      then('grant source vault is os.daemon', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.source.vault).toEqual('os.daemon');
      });
    });
  });

  /**
   * [uc4] unlock via direct binary path (not rhx shorthand)
   *
   * proves that keyrack unlock works via any invocation method.
   */
  given('[case4] repo with os.direct vault', () => {
    // cleanup daemon to ensure fresh state
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
    );

    when('[t0] bin/run keyrack unlock --env all', () => {
      const result = useThen('it completes', () =>
        invokeRhachetCliBinary({
          // use standard binary, not rhx
          args: ['keyrack', 'unlock', '--env', 'all'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output shows unlock success', () => {
        expect(result.stdout).toContain('keyrack unlock');
      });
    });
  });
});
