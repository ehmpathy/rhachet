import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('keyrack daemon cache', () => {
  /**
   * [uc1] daemon cache hit: robot uses cached value without passphrase
   * proves that after human unlocks once, robot can reuse cached credentials from daemon
   *
   * note: with the os.daemon vault, keys unlocked by human are cached in daemon memory.
   * robots can then retrieve these keys without the passphrase.
   */
  given('[case1] repo with os.secure vault, after unlock', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    // cleanup: relock any prior keys before this test
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      }),
    );

    // unlock first (simulates human unlock via env var — secure, no shell history exposure)
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--env', 'test'],
        cwd: repo.path,
        env: { HOME: repo.path, KEYRACK_PASSPHRASE: 'test-passphrase-123' },
      }),
    );

    when('[t0] keyrack get --key SECURE_API_KEY --json (no passphrase)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('grant uses cached value from daemon', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('portable-secure-value-xyz789');
      });

      then('grant source vault is os.daemon', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.source.vault).toEqual('os.daemon');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc2] daemon cache miss: robot fails without passphrase when daemon is empty
   * proves keyrack returns absent when daemon has no cached keys
   */
  given('[case2] repo with os.secure vault, daemon empty', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
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

    when('[t0] keyrack get --key SECURE_API_KEY --json (no passphrase)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked', () => {
        const parsed = JSON.parse(result.stdout);
        // key exists in os.secure but vault is locked (daemon empty, no passphrase)
        expect(parsed.status).toEqual('locked');
      });

      then('fix instructions mention unlock', () => {
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
   * [uc3] passphrase env var unlocks vault directly
   * proves passphrase env var can be used to unlock vault on-the-fly
   */
  given('[case3] repo with os.secure vault', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
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

    when('[t0] keyrack get with KEYRACK_PASSPHRASE env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            KEYRACK_PASSPHRASE: 'test-passphrase-123',
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('grant value matches pre-encrypted fixture', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('portable-secure-value-xyz789');
      });

      then('grant source vault is os.secure', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.source.vault).toEqual('os.secure');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc5] mid-session unlock: robot can access keys after human unlocks mid-session
   * proves that robot doesn't need restart after human unlocks
   *
   * flow: get fails (locked) → human unlocks → get succeeds
   */
  given('[case5] mid-session unlock flow', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
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

    when('[t0] get before unlock (should be locked)', () => {
      const resultBefore = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked before unlock', () => {
        const parsed = JSON.parse(resultBefore.stdout);
        expect(parsed.status).toEqual('locked');
      });

      then('fix mentions unlock', () => {
        const parsed = JSON.parse(resultBefore.stdout);
        expect(parsed.fix).toContain('unlock');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(resultBefore.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] unlock then get (should succeed)', () => {
      // human unlocks mid-session (via env var — secure, no shell history exposure)
      const unlockResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path, KEYRACK_PASSPHRASE: 'test-passphrase-123' },
        }),
      );

      // robot retries get
      const resultAfter = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('unlock succeeds', () => {
        expect(unlockResult.status).toEqual(0);
      });

      then('get now returns granted', () => {
        const parsed = JSON.parse(resultAfter.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('key comes from daemon', () => {
        const parsed = JSON.parse(resultAfter.stdout);
        expect(parsed.grant.source.vault).toEqual('os.daemon');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(resultAfter.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc6] interactive unlock: passphrase provided via stdin (hidden input)
   * proves human can unlock via interactive prompt (simulated with stdin pipe)
   *
   * note: in real usage, promptHiddenInput uses raw mode for hidden echo.
   * in tests, we simulate by pipe of passphrase to stdin.
   */
  given('[case6] interactive unlock via stdin', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
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

    // unlock via stdin at given level so it runs before all when blocks
    const unlockResult = useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--env', 'test'],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'test-passphrase-123\n',
      }),
    );

    when('[t0] unlock via stdin', () => {
      then('unlock exits with status 0', () => {
        expect(unlockResult.status).toEqual(0);
      });

      then('unlock stdout matches snapshot', () => {
        expect(unlockResult.stdout).toMatchSnapshot();
      });
    });

    when('[t1] get after interactive unlock (human readable)', () => {
      // robot gets key (should come from daemon)
      const getResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('get exits with status 0', () => {
        expect(getResult.status).toEqual(0);
      });

      then('get stdout matches snapshot', () => {
        expect(getResult.stdout).toMatchSnapshot();
      });
    });

    when('[t2] get after interactive unlock (json)', () => {
      // robot gets key in json mode
      const getResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('key comes from daemon', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.grant.source.vault).toEqual('os.daemon');
      });

      then('key value matches fixture', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.grant.key.secret).toEqual('portable-secure-value-xyz789');
      });
    });
  });

  /**
   * [uc4] priority: daemon cache takes precedence over source vault
   * proves robot uses daemon cache even when source vault credentials exist
   *
   * note: this is the new behavior - os.daemon replaces the old os.direct cache
   */
  given('[case4] repo with daemon cache and source vault', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    // cleanup: relock to ensure clean state
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      }),
    );

    // unlock to populate daemon cache (via env var — secure, no shell history exposure)
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--env', 'test'],
        cwd: repo.path,
        env: { HOME: repo.path, KEYRACK_PASSPHRASE: 'test-passphrase-123' },
      }),
    );

    when('[t0] keyrack get with KEYRACK_PASSPHRASE (daemon should still win)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            KEYRACK_PASSPHRASE: 'test-passphrase-123',
          },
        }),
      );

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('uses daemon cached value', () => {
        const parsed = JSON.parse(result.stdout);
        // both daemon and vault have the same value in this fixture
        expect(parsed.grant.key.secret).toEqual('portable-secure-value-xyz789');
      });

      then('source is os.daemon (not os.secure)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.source.vault).toEqual('os.daemon');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });
});
