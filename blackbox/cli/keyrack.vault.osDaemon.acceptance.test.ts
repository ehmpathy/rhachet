import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack vault os.daemon', () => {
  // kill daemon from prior test runs to prevent state leakage
  beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

  /**
   * [uc1] set --vault os.daemon stores key in daemon memory only
   * key is ephemeral — no disk persistence
   */
  given('[case1] repo with os.daemon vault', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
    );

    // cleanup: relock to ensure daemon is empty for this test
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      }),
    );

    when('[t0] keyrack set --key DAEMON_KEY --vault os.daemon', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'DAEMON_KEY',
            '--env',
            'test',
            '--vault',
            'os.daemon',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'ephemeral-daemon-secret\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains configured key', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('testorg.test.DAEMON_KEY');
        expect(parsed.vault).toEqual('os.daemon');
      });

      then('mech is EPHEMERAL_VIA_SESSION', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.mech).toEqual('EPHEMERAL_VIA_SESSION');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        const snapped = {
          ...parsed,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
          expiresAt: '__TIMESTAMP__',
        };
        expect(snapped).toMatchSnapshot();
      });
    });

    when('[t1] keyrack get after set --vault os.daemon', () => {
      // set the key first
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'DAEMON_GET_KEY',
            '--env',
            'test',
            '--vault',
            'os.daemon',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'daemon-get-test-value\n',
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.DAEMON_GET_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('grant contains the secret value', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('daemon-get-test-value');
      });

      then('grant source vault is os.daemon', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.source.vault).toEqual('os.daemon');
      });

      then('grant source mech is EPHEMERAL_VIA_SESSION', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.source.mech).toEqual('EPHEMERAL_VIA_SESSION');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps
        const snapped = {
          ...parsed,
          grant: {
            ...parsed.grant,
            expiresAt: '__TIMESTAMP__',
          },
        };
        expect(snapped).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc2] os.daemon keys are already in daemon — unlock is noop
   */
  given('[case2] os.daemon keys are already unlocked', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
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

    when('[t0] set then unlock', () => {
      // set key to daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'DAEMON_UNLOCK_KEY',
            '--env',
            'test',
            '--vault',
            'os.daemon',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'daemon-unlock-test-value\n',
        }),
      );

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

      then('key is still accessible after unlock', async () => {
        const getResult = await invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.DAEMON_UNLOCK_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.status).toEqual('granted');
        expect(parsed.grant.key.secret).toEqual('daemon-unlock-test-value');
      });
    });
  });

  /**
   * [uc3] os.daemon key absent after daemon restart
   * ephemeral keys die with daemon
   */
  given('[case3] daemon restart clears ephemeral keys', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
    );

    when('[t0] set key then relock then get', () => {
      // set key to daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'DAEMON_EPHEMERAL_KEY',
            '--env',
            'test',
            '--vault',
            'os.daemon',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'ephemeral-test-value\n',
        }),
      );

      // relock clears daemon keys
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.DAEMON_EPHEMERAL_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is absent (ephemeral key was cleared)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('absent');
      });

      then('fix mentions set', () => {
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
   * [uc4] os.daemon unlock reports "lost" when daemon no longer has key
   * unlock should report lost (not throw error) when vault doesn't have key
   */
  given('[case4] unlock reports lost for cleared daemon keys', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
    );

    when('[t0] set key then relock then unlock', () => {
      // set key to daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'DAEMON_LOST_KEY',
            '--env',
            'test',
            '--vault',
            'os.daemon',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'lost-test-value\n',
        }),
      );

      // relock clears daemon keys
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--key', 'DAEMON_LOST_KEY', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0 (graceful omit)', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains lost indicator', () => {
        expect(result.stdout).toContain('lost');
        expect(result.stdout).toContain('👻');
      });

      then('output shows key slug', () => {
        expect(result.stdout).toContain('DAEMON_LOST_KEY');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc5] os.daemon set writes pointer to host manifest (not secret)
   * ephemeral = secret lives in daemon memory only, but manifest tracks vault location
   */
  given('[case5] os.daemon set persists pointer to manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
    );

    when('[t0] set key then check list', () => {
      // set key to daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'DAEMON_NO_PERSIST_KEY',
            '--env',
            'test',
            '--vault',
            'os.daemon',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'no-persist-value\n',
        }),
      );

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

      then('os.daemon key appears in host manifest list with ephemeral mech', () => {
        const parsed = JSON.parse(result.stdout);
        // os.daemon keys appear in manifest with pointer (vault/mech), not secret
        const entry = parsed['testorg.test.DAEMON_NO_PERSIST_KEY'];
        expect(entry).toBeDefined();
        expect(entry.vault).toEqual('os.daemon');
        expect(entry.mech).toEqual('EPHEMERAL_VIA_SESSION');
      });
    });
  });
});
